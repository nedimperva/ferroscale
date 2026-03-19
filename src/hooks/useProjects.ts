"use client";

import { useCallback, useState } from "react";
import type { CalculationInput, CalculationResult, CurrencyCode } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { fingerprint } from "@/lib/calculator/fingerprint";
import { useStorageArray } from "@/hooks/useStorageState";

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
  /** Paint price per kg. */
  paintingPricePerKg?: number;
  /** Paint coverage rate in m² per kg (default 8). */
  paintingCoverageM2PerKg?: number;
  /** Number of paint coats (default 1). */
  paintingCoats?: number;
}

export interface ProjectAggregates {
  totalWeightKg: number;
  totalCost: number;
  costPerKg: number;
  currency: CurrencyCode;
  count: number;
  totalSurfaceAreaM2: number;
  paintKgNeeded: number;
  totalPaintingCost: number;
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
    "Surface Area (m²)",
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
/*  Local-storage helpers (delegated to shared utility via hook)      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Aggregation helper                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_COVERAGE_M2_PER_KG = 8;

export function computeAggregates(project: Project): ProjectAggregates {
  if (project.calculations.length === 0) {
    return { totalWeightKg: 0, totalCost: 0, costPerKg: 0, currency: "EUR", count: 0, totalSurfaceAreaM2: 0, paintKgNeeded: 0, totalPaintingCost: 0 };
  }
  let totalWeightKg = 0;
  let totalCost = 0;
  let totalSurfaceAreaM2 = 0;
  const currency = project.calculations[0].result.currency;
  for (const calc of project.calculations) {
    totalWeightKg += calc.result.totalWeightKg;
    totalCost += calc.result.grandTotalAmount;
    if (calc.result.surfaceAreaM2 != null) {
      totalSurfaceAreaM2 += calc.result.surfaceAreaM2;
    }
  }
  const roundedWeight = Math.round(totalWeightKg * 100) / 100;
  const roundedCost = Math.round(totalCost * 100) / 100;
  const costPerKg = roundedWeight > 0 ? Math.round((roundedCost / roundedWeight) * 100) / 100 : 0;
  const roundedSurfaceArea = Math.round(totalSurfaceAreaM2 * 100) / 100;
  const coverageRate = project.paintingCoverageM2PerKg ?? DEFAULT_COVERAGE_M2_PER_KG;
  const coats = project.paintingCoats ?? 1;
  const paintKgNeeded = coverageRate > 0 ? Math.round((roundedSurfaceArea * coats / coverageRate) * 100) / 100 : 0;
  const pricePerKg = project.paintingPricePerKg ?? 0;
  const totalPaintingCost = Math.round(paintKgNeeded * pricePerKg * 100) / 100;
  return {
    totalWeightKg: roundedWeight,
    totalCost: roundedCost,
    costPerKg,
    currency,
    count: project.calculations.length,
    totalSurfaceAreaM2: roundedSurfaceArea,
    paintKgNeeded,
    totalPaintingCost,
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
      r.surfaceAreaM2 ?? "",
      r.subtotalAmount,
      r.wasteAmount,
      r.vatAmount,
      r.grandTotalAmount,
      r.currency,
    ].join(",");
  });

  const agg = computeAggregates(project);
  rows.push("");
  rows.push(`${labels.total},,,"${agg.totalWeightKg}","${agg.totalSurfaceAreaM2}",,,"${agg.totalCost}","${agg.currency}"`);

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
  totalSurfaceArea: string;
  paintNeeded: string;
  paintingCost: string;
  profileColumn: string;
  materialColumn: string;
  qtyColumn: string;
  unitWeightColumn: string;
  weightColumn: string;
  surfaceAreaColumn: string;
  costColumn: string;
  noteColumn: string;
  total: string;
  subtotal: string;
  materialSummary: string;
  resolveCategoryLabel: (iconKey: string) => string;
  resolveGradeLabel?: (label: string) => string;
  resolveProfileLabel?: (profileId: string, fallback: string) => string;
}

const CATEGORY_ORDER = ["bars", "plates_sheets", "tubes", "structural"];

export function exportProjectPdf(
  project: Project,
  labels: ProjectPdfLabels,
  currencySymbols: Record<string, string>,
): void {
  if (project.calculations.length === 0) return;

  const agg = computeAggregates(project);
  const currency = currencySymbols[agg.currency] ?? agg.currency;
  const dateStr = new Date().toLocaleDateString();

  /* Group calculations by profile category (iconKey) */
  const categoryGroups = new Map<string, ProjectCalculation[]>();
  for (const calc of project.calculations) {
    const cat = calc.normalizedProfile.iconKey as string;
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(calc);
  }
  const sortedCategories = [...categoryGroups.entries()].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
  );
  const multiCategory = sortedCategories.length > 1;

  /* Build items table rows grouped by category */
  let tableBody = "";
  for (const [cat, calcs] of sortedCategories) {
    const catLabel = labels.resolveCategoryLabel(cat);

    if (multiCategory) {
      tableBody += `<tr class="cat-row"><td colspan="8">${catLabel}</td></tr>`;
    }

    let catWeight = 0;
    let catCost = 0;
    let catSurface = 0;

    for (const calc of calcs) {
      const profileLabel = calc.normalizedProfile.shortLabel;
      const gradeLabel = labels.resolveGradeLabel
        ? labels.resolveGradeLabel(calc.result.gradeLabel)
        : calc.result.gradeLabel;
      const qty = calc.result.quantity;
      const unitWt = calc.result.unitWeightKg;
      const totalWt = calc.result.totalWeightKg;
      const surfArea = calc.result.surfaceAreaM2;
      const cost = calc.result.grandTotalAmount;
      catWeight += totalWt;
      catCost += cost;
      if (surfArea != null) catSurface += surfArea;
      tableBody += `<tr>
        <td>${profileLabel}</td>
        <td>${gradeLabel}</td>
        <td class="num">${qty}</td>
        <td class="num">${unitWt}</td>
        <td class="num">${totalWt} kg</td>
        <td class="num">${surfArea != null ? surfArea + " m²" : "—"}</td>
        <td class="num">${cost} ${currency}</td>
        <td>${calc.note ?? ""}</td>
      </tr>`;
    }

    if (multiCategory) {
      const rw = Math.round(catWeight * 100) / 100;
      const rc = Math.round(catCost * 100) / 100;
      const rs = Math.round(catSurface * 100) / 100;
      tableBody += `<tr class="subtotal-row">
        <td colspan="4">${catLabel} — ${labels.subtotal}</td>
        <td class="num">${rw} kg</td>
        <td class="num">${rs > 0 ? rs + " m²" : "—"}</td>
        <td class="num">${rc} ${currency}</td>
        <td></td>
      </tr>`;
    }
  }

  /* Grand total row */
  tableBody += `<tr class="total-row">
    <td colspan="4">${labels.total}</td>
    <td class="num">${agg.totalWeightKg} kg</td>
    <td class="num">${agg.totalSurfaceAreaM2 > 0 ? agg.totalSurfaceAreaM2 + " m²" : "—"}</td>
    <td class="num">${agg.totalCost} ${currency}</td>
    <td></td>
  </tr>`;

  /* Material grade summary */
  const materialMap = new Map<string, { count: number; weight: number; cost: number }>();
  for (const calc of project.calculations) {
    const mk = labels.resolveGradeLabel
      ? labels.resolveGradeLabel(calc.result.gradeLabel)
      : calc.result.gradeLabel;
    if (!materialMap.has(mk)) materialMap.set(mk, { count: 0, weight: 0, cost: 0 });
    const entry = materialMap.get(mk)!;
    entry.count++;
    entry.weight += calc.result.totalWeightKg;
    entry.cost += calc.result.grandTotalAmount;
  }
  const materialRows = [...materialMap.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([k, v]) => {
      const rw = Math.round(v.weight * 100) / 100;
      const rc = Math.round(v.cost * 100) / 100;
      const cpk = rw > 0 ? Math.round((rc / rw) * 100) / 100 : 0;
      return `<tr>
        <td>${k}</td>
        <td class="num">${v.count}</td>
        <td class="num">${rw} kg</td>
        <td class="num">${rc} ${currency}</td>
        <td class="num">${cpk} ${currency}/kg</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${project.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 8px; font-weight: 600; }
  .meta { color: #666; font-size: 11px; margin-bottom: 4px; }
  .description { color: #444; font-size: 12px; margin: 8px 0 20px; font-style: italic; border-left: 3px solid #e5e7eb; padding-left: 10px; }
  .stats { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; flex: 1; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-value { font-size: 17px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 2px solid #e5e7eb; }
  th.num, td.num { text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 11px; }
  .cat-row td { background: #f9fafb; font-weight: 700; font-size: 11px; color: #374151; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 6px 10px; }
  .subtotal-row td { font-weight: 600; background: #f3f4f6; border-top: 1px solid #e5e7eb; color: #374151; }
  .total-row td { font-weight: 700; border-top: 2px solid #374151; padding-top: 9px; }
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
  <div class="stat"><div class="stat-label">${labels.costPerKg}</div><div class="stat-value">${agg.costPerKg} ${currency}/kg</div></div>
</div>
${agg.totalSurfaceAreaM2 > 0 ? `<div class="stats">
  <div class="stat"><div class="stat-label">${labels.totalSurfaceArea}</div><div class="stat-value">${agg.totalSurfaceAreaM2} m²</div></div>
  <div class="stat"><div class="stat-label">${labels.paintNeeded}</div><div class="stat-value">${agg.paintKgNeeded} kg</div></div>
  <div class="stat"><div class="stat-label">${labels.paintingCost}</div><div class="stat-value">${agg.totalPaintingCost} ${currency}</div></div>
</div>` : ""}

<table>
  <thead>
    <tr>
      <th>${labels.profileColumn}</th>
      <th>${labels.materialColumn}</th>
      <th class="num">${labels.qtyColumn}</th>
      <th class="num">${labels.unitWeightColumn}</th>
      <th class="num">${labels.weightColumn}</th>
      <th class="num">${labels.surfaceAreaColumn}</th>
      <th class="num">${labels.costColumn}</th>
      <th>${labels.noteColumn}</th>
    </tr>
  </thead>
  <tbody>${tableBody}</tbody>
</table>

${materialMap.size > 1 ? `<h2>${labels.materialSummary}</h2>
<table>
  <thead>
    <tr>
      <th>${labels.materialColumn}</th>
      <th class="num">#</th>
      <th class="num">${labels.weightColumn}</th>
      <th class="num">${labels.costColumn}</th>
      <th class="num">${labels.costPerKg}</th>
    </tr>
  </thead>
  <tbody>${materialRows}</tbody>
</table>` : ""}

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
  updateProjectPaintingSettings: (id: string, pricePerKg: number | undefined, coverageM2PerKg: number | undefined, coats?: number | undefined) => void;
  /** Quick-add: shows a picker if multiple projects exist, otherwise adds to the only one. */
  projectCount: number;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useStorageArray<Project>(PROJECTS_KEY);
  const [isOpen, setIsOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

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
  }, [setProjects]);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, [setProjects]);

  const updateProjectDescription = useCallback((id: string, description: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, description: description.trim() || undefined, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, [setProjects]);

  const updateProjectPaintingSettings = useCallback((id: string, pricePerKg: number | undefined, coverageM2PerKg: number | undefined, coats?: number | undefined) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, paintingPricePerKg: pricePerKg, paintingCoverageM2PerKg: coverageM2PerKg, paintingCoats: coats, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveProjectId((current) => (current === id ? null : current));
  }, [setProjects]);

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
  }, [setProjects]);

  const addCalculation = useCallback(
    (projectId: string, input: CalculationInput, result: CalculationResult): boolean => {
      let added = false;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          if (p.calculations.length >= MAX_CALCS_PER_PROJECT) return p;
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
    [setProjects],
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
  }, [setProjects]);

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
  }, [setProjects]);

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
    updateProjectPaintingSettings,
    projectCount: projects.length,
  };
}
