"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult, CurrencyCode } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";
import { fingerprint } from "@/lib/calculator/fingerprint";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProjectCalculation {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  calculations: ProjectCalculation[];
}

export interface ProjectAggregates {
  totalWeightKg: number;
  totalCost: number;
  costPerKg: number;
  currency: CurrencyCode;
  count: number;
}

export interface ProjectCsvLabels {
  headers: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  total: string;
  filePrefix: string;
  resolveGradeLabel?: (label: string) => string;
  resolveProfileLabel?: (profileId: string, fallback: string) => string;
}

const PROJECTS_KEY = "advanced-calc-projects-v2";
const MAX_PROJECTS = 20;
const MAX_CALCS_PER_PROJECT = 50;

const DEFAULT_PROJECT_CSV_LABELS: ProjectCsvLabels = {
  headers: [
    "Profile",
    "Profile Label",
    "Material",
    "Unit Weight (kg)",
    "Total Weight (kg)",
    "Subtotal",
    "Waste",
    "VAT",
    "Grand Total",
    "Currency",
  ],
  total: "Total",
  filePrefix: "project",
};

/* ------------------------------------------------------------------ */
/*  Local-storage helpers (delegated to shared utility)               */
/* ------------------------------------------------------------------ */

const loadProjects = () => loadArrayFromStorage<Project>(PROJECTS_KEY);
const persistProjects = (projects: Project[]) => persistToStorage(PROJECTS_KEY, projects);

/* ------------------------------------------------------------------ */
/*  Aggregation helper                                                */
/* ------------------------------------------------------------------ */

export function computeAggregates(project: Project): ProjectAggregates {
  if (project.calculations.length === 0) {
    return { totalWeightKg: 0, totalCost: 0, costPerKg: 0, currency: "EUR", count: 0 };
  }
  let totalWeightKg = 0;
  let totalCost = 0;
  const currency = project.calculations[0].result.currency;
  for (const calc of project.calculations) {
    totalWeightKg += calc.result.totalWeightKg;
    totalCost += calc.result.grandTotalAmount;
  }
  const roundedWeight = Math.round(totalWeightKg * 100) / 100;
  const roundedCost = Math.round(totalCost * 100) / 100;
  const costPerKg = roundedWeight > 0 ? Math.round((roundedCost / roundedWeight) * 100) / 100 : 0;
  return {
    totalWeightKg: roundedWeight,
    totalCost: roundedCost,
    costPerKg,
    currency,
    count: project.calculations.length,
  };
}

/* ------------------------------------------------------------------ */
/*  CSV export                                                        */
/* ------------------------------------------------------------------ */

export function exportProjectCsv(
  project: Project,
  labels: ProjectCsvLabels = DEFAULT_PROJECT_CSV_LABELS,
): void {
  if (project.calculations.length === 0) return;

  const headers = labels.headers;
  const rows = project.calculations.map((calc) => {
    const r = calc.result;
    return [
      calc.normalizedProfile.shortLabel,
      labels.resolveProfileLabel
        ? labels.resolveProfileLabel(r.profileId, r.profileLabel)
        : r.profileLabel,
      labels.resolveGradeLabel ? labels.resolveGradeLabel(r.gradeLabel) : r.gradeLabel,
      r.unitWeightKg,
      r.totalWeightKg,
      r.subtotalAmount,
      r.wasteAmount,
      r.vatAmount,
      r.grandTotalAmount,
      r.currency,
    ].join(",");
  });

  const agg = computeAggregates(project);
  rows.push("");
  rows.push(`${labels.total},,,"${agg.totalWeightKg}",,,,"${agg.totalCost}","${agg.currency}"`);

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${labels.filePrefix}-${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  PDF export                                                        */
/* ------------------------------------------------------------------ */

export interface ProjectPdfLabels {
  title: string;
  description: string;
  date: string;
  items: string;
  totalWeight: string;
  totalCost: string;
  costPerKg: string;
  profileColumn: string;
  materialColumn: string;
  weightColumn: string;
  costColumn: string;
  noteColumn: string;
  total: string;
  profileBreakdown: string;
  materialBreakdown: string;
  resolveGradeLabel?: (label: string) => string;
  resolveProfileLabel?: (profileId: string, fallback: string) => string;
}

export function exportProjectPdf(
  project: Project,
  labels: ProjectPdfLabels,
  currencySymbols: Record<string, string>,
): void {
  if (project.calculations.length === 0) return;

  const agg = computeAggregates(project);
  const currency = currencySymbols[agg.currency] ?? agg.currency;
  const dateStr = new Date().toLocaleDateString();

  /* Profile breakdown */
  const profileMap = new Map<string, { count: number; weight: number }>();
  const materialMap = new Map<string, { count: number; weight: number }>();
  for (const calc of project.calculations) {
    const pk = calc.normalizedProfile.shortLabel;
    const mk = labels.resolveGradeLabel ? labels.resolveGradeLabel(calc.result.gradeLabel) : calc.result.gradeLabel;
    const w = calc.result.totalWeightKg;
    if (!profileMap.has(pk)) profileMap.set(pk, { count: 0, weight: 0 });
    if (!materialMap.has(mk)) materialMap.set(mk, { count: 0, weight: 0 });
    profileMap.get(pk)!.count++;
    profileMap.get(pk)!.weight += w;
    materialMap.get(mk)!.count++;
    materialMap.get(mk)!.weight += w;
  }

  const profileRows = [...profileMap.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v.count}</td><td>${Math.round(v.weight * 100) / 100} kg</td></tr>`)
    .join("");

  const materialRows = [...materialMap.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v.count}</td><td>${Math.round(v.weight * 100) / 100} kg</td></tr>`)
    .join("");

  const calcRows = project.calculations.map((calc) => {
    const profileLabel = calc.normalizedProfile.shortLabel;
    const gradeLabel = labels.resolveGradeLabel ? labels.resolveGradeLabel(calc.result.gradeLabel) : calc.result.gradeLabel;
    const weight = calc.result.totalWeightKg;
    const cost = calc.result.grandTotalAmount;
    const note = calc.note ?? "";
    return `<tr>
      <td>${profileLabel}</td>
      <td>${gradeLabel}</td>
      <td>${weight} kg</td>
      <td>${cost} ${currency}</td>
      <td>${note}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${project.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 8px; }
  .description { color: #444; font-size: 12px; margin-bottom: 20px; font-style: italic; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; flex: 1; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-value { font-size: 18px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f9fafb; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .total-row td { font-weight: 700; border-top: 2px solid #e5e7eb; padding-top: 10px; }
  .breakdown { display: flex; gap: 24px; margin-bottom: 24px; }
  .breakdown-section { flex: 1; }
  .breakdown-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; }
  .breakdown-section table { margin-bottom: 0; }
  .breakdown-section th, .breakdown-section td { padding: 5px 8px; font-size: 11px; }
  .footer { color: #aaa; font-size: 10px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>${project.name}</h1>
<p class="meta">${labels.date}: ${dateStr}</p>
${project.description ? `<p class="description">${project.description}</p>` : ""}

<div class="stats">
  <div class="stat"><div class="stat-label">${labels.items}</div><div class="stat-value">${agg.count}</div></div>
  <div class="stat"><div class="stat-label">${labels.totalWeight}</div><div class="stat-value">${agg.totalWeightKg} kg</div></div>
  <div class="stat"><div class="stat-label">${labels.totalCost}</div><div class="stat-value">${agg.totalCost} ${currency}</div></div>
  <div class="stat"><div class="stat-label">${labels.costPerKg}</div><div class="stat-value">${agg.costPerKg} ${currency}</div></div>
</div>

<table>
  <thead>
    <tr>
      <th>${labels.profileColumn}</th>
      <th>${labels.materialColumn}</th>
      <th>${labels.weightColumn}</th>
      <th>${labels.costColumn}</th>
      <th>${labels.noteColumn}</th>
    </tr>
  </thead>
  <tbody>
    ${calcRows}
    <tr class="total-row">
      <td>${labels.total}</td>
      <td></td>
      <td>${agg.totalWeightKg} kg</td>
      <td>${agg.totalCost} ${currency}</td>
      <td></td>
    </tr>
  </tbody>
</table>

<div class="breakdown">
  <div class="breakdown-section">
    <h3>${labels.profileBreakdown}</h3>
    <table>
      <thead><tr><th>${labels.profileColumn}</th><th>#</th><th>${labels.weightColumn}</th></tr></thead>
      <tbody>${profileRows}</tbody>
    </table>
  </div>
  <div class="breakdown-section">
    <h3>${labels.materialBreakdown}</h3>
    <table>
      <thead><tr><th>${labels.materialColumn}</th><th>#</th><th>${labels.weightColumn}</th></tr></thead>
      <tbody>${materialRows}</tbody>
    </table>
  </div>
</div>

<div class="footer">FerroScale &middot; ${dateStr}</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseProjectsReturn {
  projects: Project[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** The project currently being viewed in the drawer (null = list view). */
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  createProject: (name: string) => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;
  addCalculation: (projectId: string, input: CalculationInput, result: CalculationResult) => boolean;
  removeCalculation: (projectId: string, calcId: string) => void;
  updateCalculationNote: (projectId: string, calcId: string, note: string) => void;
  updateProjectDescription: (id: string, description: string) => void;
  /** Quick-add: shows a picker if multiple projects exist, otherwise adds to the only one. */
  projectCount: number;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  /* Hydrate from localStorage on mount (empty [] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    const stored = loadProjects();
    if (stored.length > 0) setProjects(stored); // eslint-disable-line react-hooks/set-state-in-effect
    hydrated.current = true;
  }, []);

  /* Persist on change (skip the initial hydration write-back) */
  useEffect(() => {
    if (hydrated.current) persistProjects(projects);
  }, [projects]);

  const createProject = useCallback((name: string): Project => {
    const now = new Date().toISOString();
    const trimmed = name.trim();
    const project: Project = {
      id: crypto.randomUUID(),
      name: trimmed.length > 0 ? trimmed : `P-${now.slice(0, 10)}`,
      createdAt: now,
      updatedAt: now,
      calculations: [],
    };
    setProjects((prev) => {
      if (prev.length >= MAX_PROJECTS) return prev;
      return [project, ...prev];
    });
    return project;
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, []);

  const updateProjectDescription = useCallback((id: string, description: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, description: description.trim() || undefined, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveProjectId((current) => (current === id ? null : current));
  }, []);

  const duplicateProject = useCallback((id: string): Project | null => {
    let duplicate: Project | null = null;
    setProjects((prev) => {
      if (prev.length >= MAX_PROJECTS) return prev;
      const original = prev.find((p) => p.id === id);
      if (!original) return prev;
      const now = new Date().toISOString();
      duplicate = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (copy)`,
        createdAt: now,
        updatedAt: now,
        calculations: original.calculations.map((c) => ({ ...c, id: crypto.randomUUID() })),
      };
      return [duplicate, ...prev];
    });
    return duplicate;
  }, []);

  const addCalculation = useCallback(
    (projectId: string, input: CalculationInput, result: CalculationResult): boolean => {
      let added = false;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          if (p.calculations.length >= MAX_CALCS_PER_PROJECT) return p;
          /* Check for duplicate */
          const fp = fingerprint(result);
          if (p.calculations.some((c) => fingerprint(c.result) === fp)) return p;

          added = true;
          const calc: ProjectCalculation = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            input,
            result,
            normalizedProfile: normalizeProfileSnapshot(input),
          };
          return {
            ...p,
            updatedAt: new Date().toISOString(),
            calculations: [...p.calculations, calc],
          };
        }),
      );
      return added;
    },
    [],
  );

  const removeCalculation = useCallback((projectId: string, calcId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          calculations: p.calculations.filter((c) => c.id !== calcId),
        };
      }),
    );
  }, []);

  const updateCalculationNote = useCallback((projectId: string, calcId: string, note: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          calculations: p.calculations.map((c) =>
            c.id === calcId ? { ...c, note: note.trim() || undefined } : c,
          ),
        };
      }),
    );
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveProjectId(null);
  }, []);

  return {
    projects,
    isOpen,
    open,
    close,
    activeProjectId,
    setActiveProjectId,
    createProject,
    renameProject,
    deleteProject,
    duplicateProject,
    addCalculation,
    removeCalculation,
    updateCalculationNote,
    updateProjectDescription,
    projectCount: projects.length,
  };
}
