"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult, CurrencyCode } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { fingerprint, templateFingerprint } from "@/lib/calculator/fingerprint";
import { calculateMetal } from "@/lib/calculator/engine";
import {
  isActiveSyncEntity,
  loadProjects,
  markEntityDeleted,
  persistProjects,
} from "@/lib/sync/collections";
import {
  projectSurfaceM2,
  totalPaint,
  type ProjectPaintCoat,
} from "@/lib/projects/paint";
import type { AssemblyTemplate } from "@/hooks/useAssemblyTemplates";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProjectTemplatePart {
  id: string;
  name: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
}

export type ProjectStatus = "draft" | "quoted" | "archived";

export const PROJECT_STATUSES: readonly ProjectStatus[] = ["draft", "quoted", "archived"];

export type ProjectCategory =
  | "structural"
  | "stairs_railings"
  | "roof_trusses"
  | "gates_fences"
  | "sheet_metal"
  | "maintenance"
  | "general";

export const PROJECT_CATEGORIES: readonly ProjectCategory[] = [
  "structural",
  "stairs_railings",
  "roof_trusses",
  "gates_fences",
  "sheet_metal",
  "maintenance",
  "general",
];

export interface ProjectAdditionalCost {
  id: string;
  label: string;
  amount: number;
  category?: "hardware" | "transport" | "finishing" | "other";
}

export interface ProjectCalculation {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
  note?: string;
  /** Sub-assembly grouping tag (e.g. "Stringers", "Treads", "Handrail"). */
  assembly?: string;
  /** Present when this entry represents a template added as a single item. */
  templateName?: string;
  /** Individual parts of the template with their own calculations. */
  templateParts?: ProjectTemplatePart[];
  /** How many times the template was multiplied when added. */
  quantityMultiplier?: number;
}

/**
 * One line of a project's history. Kinds are i18n keys, not sentences, so the
 * log reads in whatever language the app is in at the time it is *read* —
 * storing rendered text would freeze it in the language it was written.
 */
export type ProjectActivityKind =
  | "created"
  | "renamed"
  | "clientSet"
  | "statusChanged"
  | "dueDateSet"
  | "itemAdded"
  | "itemsAdded"
  | "itemRemoved"
  | "qtyChanged"
  | "quotePrinted";

export interface ProjectActivityEntry {
  id: string;
  at: string;
  kind: ProjectActivityKind;
  /** Subject of the event — a profile label, a project name, a count. */
  detail?: string;
  from?: string;
  to?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  /** Who the job is for. Free text — it drives the client rail's grouping. */
  client?: string;
  /** Absent means `draft`; stored only once it moves off the default. */
  status?: ProjectStatus;
  /** Fabrication category/tag. */
  category?: ProjectCategory;
  /** Per-project margin override (percentage, e.g. 15 for +15%). */
  marginPercent?: number;
  /** Estimated shop fabrication/welding hours. */
  laborHours?: number;
  /** Hourly shop labor rate in project currency. */
  laborRatePerHour?: number;
  /** Extra job expenses (Hardware, Transport, Finishing, etc.). */
  additionalCosts?: ProjectAdditionalCost[];
  /** ISO date (YYYY-MM-DD), not a timestamp — a due date has no clock. */
  dueDate?: string;
  /** Newest first, capped at MAX_ACTIVITY. */
  activity?: ProjectActivityEntry[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  calculations: ProjectCalculation[];
  /** One row per paint (primer, finish, extra). Surface comes from the items. */
  paintCoats?: ProjectPaintCoat[];
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
  paintCoatTotals: ReturnType<typeof totalPaint>["coats"];
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

/** A project list you can hold in your head; also the sync payload ceiling. */
export const MAX_PROJECTS = 20;
const MAX_CALCS_PER_PROJECT = 50;
/** The right rail shows a history, not an audit trail — old lines fall off. */
const MAX_ACTIVITY = 40;

export function projectStatus(project: Project): ProjectStatus {
  return project.status ?? "draft";
}

export function isArchivedProject(project: Project): boolean {
  return projectStatus(project) === "archived";
}

/** Prepend an event and re-stamp `updatedAt`. Pure — callers map over it. */
function withActivity(
  project: Project,
  kind: ProjectActivityKind,
  fields: Omit<ProjectActivityEntry, "id" | "at" | "kind"> = {},
): Project {
  const at = new Date().toISOString();
  const entry: ProjectActivityEntry = { id: crypto.randomUUID(), at, kind, ...fields };
  return {
    ...project,
    updatedAt: at,
    activity: [entry, ...(project.activity ?? [])].slice(0, MAX_ACTIVITY),
  };
}

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

export function computeAggregates(project: Project): ProjectAggregates {
  const emptyPaint = { coats: [] as ReturnType<typeof totalPaint>["coats"], kg: 0, cost: 0 };
  if (project.calculations.length === 0) {
    return {
      totalWeightKg: 0,
      totalCost: 0,
      costPerKg: 0,
      currency: "EUR",
      count: 0,
      totalSurfaceAreaM2: 0,
      paintKgNeeded: 0,
      totalPaintingCost: 0,
      paintCoatTotals: [],
    };
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
  const roundedSurfaceArea = projectSurfaceM2(project.calculations);
  const paint = project.paintCoats?.length
    ? totalPaint(roundedSurfaceArea, project.paintCoats)
    : emptyPaint;
  return {
    totalWeightKg: roundedWeight,
    totalCost: roundedCost,
    costPerKg,
    currency,
    count: project.calculations.length,
    totalSurfaceAreaM2: roundedSurfaceArea,
    paintKgNeeded: paint.kg,
    totalPaintingCost: paint.cost,
    paintCoatTotals: paint.coats,
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
    if (calc.templateName) {
      return [
        `"${calc.templateName} x${calc.quantityMultiplier ?? 1}"`,
        "",
        "Mixed",
        "",
        r.totalWeightKg,
        r.surfaceAreaM2 ?? "",
        "",
        "",
        "",
        r.grandTotalAmount,
        r.currency,
      ].join(",");
    }
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
      const totalWt = calc.result.totalWeightKg;
      const surfArea = calc.result.surfaceAreaM2;
      const cost = calc.result.grandTotalAmount;
      catWeight += totalWt;
      catCost += cost;
      if (surfArea != null) catSurface += surfArea;

      if (calc.templateName) {
        tableBody += `<tr>
        <td>${calc.templateName} x${calc.quantityMultiplier ?? 1}</td>
        <td>Mixed</td>
        <td class="num">${calc.templateParts?.length ?? 0} parts</td>
        <td class="num">—</td>
        <td class="num">${totalWt} kg</td>
        <td class="num">${surfArea != null ? surfArea + " m²" : "—"}</td>
        <td class="num">${cost} ${currency}</td>
        <td>${calc.note ?? ""}</td>
      </tr>`;
      } else {
        const profileLabel = calc.normalizedProfile.shortLabel;
        const gradeLabel = labels.resolveGradeLabel
          ? labels.resolveGradeLabel(calc.result.gradeLabel)
          : calc.result.gradeLabel;
        const qty = calc.result.quantity;
        const unitWt = calc.result.unitWeightKg;
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
    if (calc.templateName) {
      // Template entries contribute to "Mixed" material
      const mk = "Mixed";
      if (!materialMap.has(mk)) materialMap.set(mk, { count: 0, weight: 0, cost: 0 });
      const entry = materialMap.get(mk)!;
      entry.count++;
      entry.weight += calc.result.totalWeightKg;
      entry.cost += calc.result.grandTotalAmount;
    } else {
      const mk = labels.resolveGradeLabel
        ? labels.resolveGradeLabel(calc.result.gradeLabel)
        : calc.result.gradeLabel;
      if (!materialMap.has(mk)) materialMap.set(mk, { count: 0, weight: 0, cost: 0 });
      const entry = materialMap.get(mk)!;
      entry.count++;
      entry.weight += calc.result.totalWeightKg;
      entry.cost += calc.result.grandTotalAmount;
    }
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
  updateProjectMeta: (
    id: string,
    patch: {
      client?: string;
      status?: ProjectStatus;
      dueDate?: string;
      category?: ProjectCategory;
      marginPercent?: number;
    },
  ) => void;
  updateProjectLabor: (
    id: string,
    labor: { laborHours?: number; laborRatePerHour?: number },
  ) => void;
  updateProjectAdditionalCosts: (id: string, costs: ProjectAdditionalCost[]) => void;
  updateItemAssembly: (projectId: string, calcId: string, assembly?: string) => void;
  batchArchiveProjects: (ids: string[]) => void;
  batchDeleteProjects: (ids: string[]) => void;
  logQuotePrinted: (id: string) => void;
  deleteProject: (id: string) => void;
  /** Undo a delete — clears the tombstone so sync keeps the project alive. */
  restoreProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;
  addCalculation: (
    projectId: string,
    input: CalculationInput,
    result: CalculationResult,
    assembly?: string,
  ) => boolean;
  /** Bulk add in one state update — see the note on the implementation. */
  addCalculations: (
    projectId: string,
    entries: Array<{ input: CalculationInput; result: CalculationResult }>,
  ) => void;
  addTemplateCalculation: (projectId: string, templateName: string, parts: Array<{ id: string; name: string; input: CalculationInput; result: CalculationResult; normalizedProfile: NormalizedProfileSnapshot }>, multiplier: number) => boolean;
  insertAssemblyTemplate: (
    projectId: string,
    template: AssemblyTemplate,
    multiplier: number,
    customAssemblyName?: string,
  ) => boolean;
  scaleSubAssembly: (
    projectId: string,
    assemblyName: string,
    multiplier: number,
  ) => boolean;
  createProjectFromTemplate: (
    name: string,
    template: AssemblyTemplate,
    multiplier?: number,
  ) => Project;
  removeCalculation: (projectId: string, calcId: string) => void;
  updateCalculationQuantity: (projectId: string, calcId: string, quantity: number) => void;
  updateCalculationNote: (projectId: string, calcId: string, note: string) => void;
  updateProjectDescription: (id: string, description: string) => void;
  updateProjectPaintCoats: (id: string, coats: ProjectPaintCoat[]) => void;
  /** Quick-add: shows a picker if multiple projects exist, otherwise adds to the only one. */
  projectCount: number;
}

export function useProjects(): UseProjectsReturn {
  const [allProjects, setAllProjects] = useState<Project[]>(() => {
    if (typeof window !== "undefined") {
      return loadProjects();
    }
    return [];
  });
  const projectsRef = useRef<Project[]>(allProjects);
  const [isOpen, setIsOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  /**
   * The ref is the authoritative list, not the rendered state.
   *
   * React defers a state updater to the next render, so anything computed
   * inside one — a flag, a ref assignment, a persist — has not happened yet
   * when the caller returns. Creating a project and immediately adding to it
   * used to report failure for exactly that reason. Writes are folded here,
   * synchronously, and the render is told afterwards.
   */
  const setProjects = useCallback((updater: React.SetStateAction<Project[]>) => {
    const previous = projectsRef.current;
    const next = typeof updater === "function"
      ? (updater as (prev: Project[]) => Project[])(previous)
      : updater;
    projectsRef.current = next;
    persistProjects(next);
    setAllProjects(next);
  }, []);

  const projects = allProjects.filter((project) => isActiveSyncEntity(project));

  useEffect(() => {
    projectsRef.current = allProjects;
  }, [allProjects]);

  const createProject = useCallback((name: string): Project => {
    const now = new Date().toISOString();
    const trimmed = name.trim();
    const project: Project = {
      id: crypto.randomUUID(),
      name: trimmed.length > 0 ? trimmed : `P-${now.slice(0, 10)}`,
      createdAt: now,
      updatedAt: now,
      calculations: [],
      activity: [{ id: crypto.randomUUID(), at: now, kind: "created" }],
    };
    setProjects((prev) => {
      if (prev.filter((project) => !project.deletedAt).length >= MAX_PROJECTS) return prev;
      return [project, ...prev];
    });
    return project;
  }, [setProjects]);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.deletedAt) return p;
        const next = name.trim();
        if (!next || next === p.name) return p;
        return withActivity({ ...p, name: next }, "renamed", { from: p.name, to: next });
      }),
    );
  }, [setProjects]);

  /**
   * Client, status and due date in one call. Each changed field logs its own
   * activity line, so the rail reads as a history rather than "project edited".
   */
  const updateProjectMeta = useCallback(
    (
      id: string,
      patch: {
        client?: string;
        status?: ProjectStatus;
        dueDate?: string;
        category?: ProjectCategory;
        marginPercent?: number;
      },
    ) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id || p.deletedAt) return p;
          let next = p;
          if (patch.client !== undefined) {
            const client = patch.client.trim();
            if (client !== (p.client ?? "")) {
              next = withActivity({ ...next, client: client || undefined }, "clientSet", {
                to: client || undefined,
              });
            }
          }
          if (patch.status !== undefined && patch.status !== projectStatus(p)) {
            next = withActivity({ ...next, status: patch.status }, "statusChanged", {
              from: projectStatus(p),
              to: patch.status,
            });
          }
          if (patch.dueDate !== undefined) {
            const dueDate = patch.dueDate.trim();
            if (dueDate !== (p.dueDate ?? "")) {
              next = withActivity({ ...next, dueDate: dueDate || undefined }, "dueDateSet", {
                to: dueDate || undefined,
              });
            }
          }
          if (patch.category !== undefined) {
            next = { ...next, category: patch.category || undefined, updatedAt: new Date().toISOString() };
          }
          if (patch.marginPercent !== undefined) {
            const m = Math.max(0, Math.min(500, Number(patch.marginPercent) || 0));
            next = { ...next, marginPercent: m, updatedAt: new Date().toISOString() };
          }
          return next;
        }),
      );
    },
    [setProjects],
  );

  const updateProjectLabor = useCallback(
    (id: string, labor: { laborHours?: number; laborRatePerHour?: number }) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id || p.deletedAt) return p;
          return {
            ...p,
            laborHours: labor.laborHours !== undefined ? Math.max(0, Number(labor.laborHours) || 0) : p.laborHours,
            laborRatePerHour: labor.laborRatePerHour !== undefined ? Math.max(0, Number(labor.laborRatePerHour) || 0) : p.laborRatePerHour,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setProjects],
  );

  const updateProjectAdditionalCosts = useCallback(
    (id: string, costs: ProjectAdditionalCost[]) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id || p.deletedAt) return p;
          return {
            ...p,
            additionalCosts: costs,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setProjects],
  );

  const updateItemAssembly = useCallback(
    (projectId: string, calcId: string, assembly?: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          return {
            ...p,
            updatedAt: new Date().toISOString(),
            calculations: p.calculations.map((c) =>
              c.id === calcId ? { ...c, assembly: assembly?.trim() || undefined } : c,
            ),
          };
        }),
      );
    },
    [setProjects],
  );

  const batchArchiveProjects = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const targetSet = new Set(ids);
      setProjects((prev) =>
        prev.map((p) => {
          if (!targetSet.has(p.id) || p.deletedAt || p.status === "archived") return p;
          return withActivity({ ...p, status: "archived" }, "statusChanged", {
            from: projectStatus(p),
            to: "archived",
          });
        }),
      );
    },
    [setProjects],
  );

  const batchDeleteProjects = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const targetSet = new Set(ids);
      const deletedAt = new Date().toISOString();
      setProjects((prev) =>
        prev.map((p) => (targetSet.has(p.id) && !p.deletedAt ? markEntityDeleted(p, deletedAt) : p)),
      );
      setActiveProjectId((current) => (current && targetSet.has(current) ? null : current));
    },
    [setProjects],
  );

  /** Printing a quote is the one read that belongs in the history. */
  const logQuotePrinted = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id && !p.deletedAt ? withActivity(p, "quotePrinted") : p)),
    );
  }, [setProjects]);

  const updateProjectDescription = useCallback((id: string, description: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id && !p.deletedAt
          ? { ...p, description: description.trim() || undefined, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, [setProjects]);

  const updateProjectPaintCoats = useCallback((id: string, coats: ProjectPaintCoat[]) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id && !p.deletedAt
          ? { ...p, paintCoats: coats, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    setProjects((prev) =>
      prev.map((project) => (
        project.id === id && !project.deletedAt ? markEntityDeleted(project, deletedAt) : project
      )),
    );
    setActiveProjectId((current) => (current === id ? null : current));
  }, [setProjects]);

  /**
   * Undo a delete. The tombstone is what sync propagates, so restoring is
   * clearing it — and `updatedAt` has to move, or a peer's delete wins the
   * next merge and the project vanishes again.
   */
  const restoreProject = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id || !project.deletedAt) return project;
        const { deletedAt: _deletedAt, ...rest } = project;
        void _deletedAt;
        return { ...rest, updatedAt: new Date().toISOString() };
      }),
    );
  }, [setProjects]);

  const duplicateProject = useCallback((id: string): Project | null => {
    let duplicate: Project | null = null;
    setProjects((prev) => {
      if (prev.filter((project) => !project.deletedAt).length >= MAX_PROJECTS) return prev;
      const original = prev.find((p) => p.id === id && !p.deletedAt);
      if (!original) return prev;
      const now = new Date().toISOString();
      duplicate = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (copy)`,
        createdAt: now,
        updatedAt: now,
        deletedAt: undefined,
        // A copy is a new job: it inherits the items and the client, not the
        // original's history or its quoted/archived state.
        status: undefined,
        activity: [{ id: crypto.randomUUID(), at: now, kind: "created" }],
        calculations: original.calculations.map((c) => ({ ...c, id: crypto.randomUUID() })),
      };
      return [duplicate, ...prev];
    });
    return duplicate;
  }, [setProjects]);

  const addCalculation = useCallback(
    (
      projectId: string,
      input: CalculationInput,
      result: CalculationResult,
      assembly?: string,
    ): boolean => {
      const fp = fingerprint(result);
      const target = projectsRef.current.find((p) => p.id === projectId && !p.deletedAt);
      if (!target) return false;
      if (target.calculations.length >= MAX_CALCS_PER_PROJECT) return false;
      if (target.calculations.some((c) => fingerprint(c.result) === fp)) return false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          const calc: ProjectCalculation = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            input,
            result,
            normalizedProfile: normalizeProfileSnapshot(input),
            assembly: assembly?.trim() || undefined,
          };
          return withActivity({ ...p, calculations: [...p.calculations, calc] }, "itemAdded", {
            detail: calc.normalizedProfile.shortLabel,
          });
        }),
      );
      return true;
    },
    [setProjects],
  );

  /**
   * Add several calculations in one state update.
   *
   * `addCalculation` reports success through a flag its updater sets, which
   * only reads back correctly for a single call — in a loop every call after
   * the first is queued, so the flag lies. Bulk work goes through here: one
   * updater, one pass, fingerprint-deduped against the project and itself.
   */
  const addCalculations = useCallback(
    (
      projectId: string,
      entries: Array<{ input: CalculationInput; result: CalculationResult }>,
    ): void => {
      if (entries.length === 0) return;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          const seen = new Set(p.calculations.map((c) => fingerprint(c.result)));
          const next: ProjectCalculation[] = [];
          for (const entry of entries) {
            if (p.calculations.length + next.length >= MAX_CALCS_PER_PROJECT) break;
            const fp = fingerprint(entry.result);
            if (seen.has(fp)) continue;
            seen.add(fp);
            next.push({
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              input: entry.input,
              result: entry.result,
              normalizedProfile: normalizeProfileSnapshot(entry.input),
            });
          }
          if (next.length === 0) return p;
          const withItems = { ...p, calculations: [...p.calculations, ...next] };
          return next.length === 1
            ? withActivity(withItems, "itemAdded", {
                detail: next[0].normalizedProfile.shortLabel,
              })
            : withActivity(withItems, "itemsAdded", { detail: String(next.length) });
        }),
      );
    },
    [setProjects],
  );

  const addTemplateCalculation = useCallback(
    (
      projectId: string,
      tplName: string,
      parts: Array<{ id: string; name: string; input: CalculationInput; result: CalculationResult; normalizedProfile: NormalizedProfileSnapshot }>,
      multiplier: number,
    ): boolean => {
      if (parts.length === 0) return false;

      // Recalculate each part with adjusted quantity
      const recalculatedParts: ProjectTemplatePart[] = [];
      for (const part of parts) {
        const adjustedInput = {
          ...part.input,
          quantity: Math.max(1, Math.floor((part.input.quantity || 1) * multiplier)),
        };
        const calc = calculateMetal(adjustedInput);
        if (!calc.ok) continue;
        recalculatedParts.push({
          id: part.id,
          name: part.name,
          input: adjustedInput,
          result: calc.result,
          normalizedProfile: part.normalizedProfile,
        });
      }
      if (recalculatedParts.length === 0) return false;

      // Aggregate totals from all parts
      let totalWeightKg = 0;
      let totalCost = 0;
      let totalSurface = 0;
      for (const p of recalculatedParts) {
        totalWeightKg += p.result.totalWeightKg;
        totalCost += p.result.grandTotalAmount;
        if (p.result.surfaceAreaM2 != null) totalSurface += p.result.surfaceAreaM2;
      }
      totalWeightKg = Math.round(totalWeightKg * 100) / 100;
      totalCost = Math.round(totalCost * 100) / 100;
      totalSurface = Math.round(totalSurface * 100) / 100;

      // Use first part as representative for the top-level entry
      const representative = recalculatedParts[0];
      const syntheticResult: CalculationResult = {
        ...representative.result,
        totalWeightKg,
        grandTotalAmount: totalCost,
        surfaceAreaM2: totalSurface > 0 ? totalSurface : null,
        // Keep unit values from first part as approximation
        unitWeightKg: representative.result.unitWeightKg,
        subtotalAmount: totalCost,
        wasteAmount: 0,
        vatAmount: 0,
      };

      const fp = templateFingerprint(tplName, totalWeightKg, totalCost);

      const target = projectsRef.current.find((p) => p.id === projectId && !p.deletedAt);
      if (!target) return false;
      if (target.calculations.length >= MAX_CALCS_PER_PROJECT) return false;
      const duplicate = target.calculations.some((c) =>
        c.templateName
          ? templateFingerprint(c.templateName, c.result.totalWeightKg, c.result.grandTotalAmount) === fp
          : false,
      );
      if (duplicate) return false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          const entry: ProjectCalculation = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            input: representative.input,
            result: syntheticResult,
            normalizedProfile: representative.normalizedProfile,
            templateName: tplName,
            templateParts: recalculatedParts,
            quantityMultiplier: multiplier,
          };
          return withActivity({ ...p, calculations: [...p.calculations, entry] }, "itemAdded", {
            detail: tplName,
          });
        }),
      );
      return true;
    },
    [setProjects],
  );

  const insertAssemblyTemplate = useCallback(
    (
      projectId: string,
      template: AssemblyTemplate,
      multiplier: number,
      customAssemblyName?: string,
    ): boolean => {
      const mult = Math.max(1, Math.floor(multiplier || 1));
      if (!template.items || template.items.length === 0) return false;

      const project = projectsRef.current.find((p) => p.id === projectId && !p.deletedAt);
      if (!project || project.calculations.length >= MAX_CALCS_PER_PROJECT) return false;

      const now = new Date().toISOString();
      const asmTag = customAssemblyName?.trim() || template.name;

      const newCalcs: ProjectCalculation[] = [];
      for (const item of template.items) {
        const itemQty = Math.max(1, Math.floor((item.quantity || 1) * mult));
        const nextInput = { ...item.input, quantity: itemQty };
        const calc = calculateMetal(nextInput);
        if (!calc.ok) continue;
        newCalcs.push({
          id: crypto.randomUUID(),
          timestamp: now,
          input: nextInput,
          result: calc.result,
          normalizedProfile: item.normalizedProfile ?? normalizeProfileSnapshot(nextInput),
          assembly: asmTag,
          note: item.note,
        });
      }

      if (newCalcs.length === 0) return false;

      // Scale labor hours
      let nextLaborHours = project.laborHours;
      if (template.laborHours !== undefined && template.laborHours > 0) {
        nextLaborHours = (project.laborHours ?? 0) + template.laborHours * mult;
      }

      // Scale additional costs
      let nextAdditionalCosts = project.additionalCosts;
      if (template.additionalCosts && template.additionalCosts.length > 0) {
        const scaledCosts: ProjectAdditionalCost[] = template.additionalCosts.map((c) => ({
          id: crypto.randomUUID(),
          label: mult > 1 ? `${c.label} (×${mult})` : c.label,
          amount: Math.round(c.amount * mult * 100) / 100,
          category: c.category,
        }));
        nextAdditionalCosts = [...(project.additionalCosts ?? []), ...scaledCosts];
      }

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          return withActivity(
            {
              ...p,
              category: p.category || template.category,
              calculations: [...p.calculations, ...newCalcs],
              laborHours: nextLaborHours,
              additionalCosts: nextAdditionalCosts,
              updatedAt: now,
            },
            "itemAdded",
            { detail: `${template.name} (×${mult})` },
          );
        }),
      );
      return true;
    },
    [setProjects],
  );

  const scaleSubAssembly = useCallback(
    (projectId: string, assemblyName: string, multiplier: number): boolean => {
      const mult = Number(multiplier);
      if (!Number.isFinite(mult) || mult <= 0) return false;

      const project = projectsRef.current.find((p) => p.id === projectId && !p.deletedAt);
      if (!project) return false;

      const targetAsm = assemblyName.trim();
      let hasMatching = false;

      const updatedCalcs = project.calculations.map((c) => {
        const asm = c.assembly?.trim() || "";
        if (asm !== targetAsm) return c;

        hasMatching = true;
        const nextQty = Math.max(1, Math.round((c.input.quantity || 1) * mult));
        if (nextQty === c.input.quantity) return c;

        const nextInput = { ...c.input, quantity: nextQty };
        const res = calculateMetal(nextInput);
        if (!res.ok) return c;

        return {
          ...c,
          input: nextInput,
          result: res.result,
        };
      });

      if (!hasMatching) return false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          return withActivity(
            {
              ...p,
              calculations: updatedCalcs,
              updatedAt: new Date().toISOString(),
            },
            "qtyChanged",
            { detail: `${targetAsm || "General"} (×${mult})`, from: "1", to: String(mult) },
          );
        }),
      );
      return true;
    },
    [setProjects],
  );

  const createProjectFromTemplate = useCallback(
    (name: string, template: AssemblyTemplate, multiplier = 1): Project => {
      const mult = Math.max(1, Math.floor(multiplier || 1));
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();
      const asmTag = template.name;

      const newCalcs: ProjectCalculation[] = [];
      for (const item of template.items) {
        const itemQty = Math.max(1, Math.floor((item.quantity || 1) * mult));
        const nextInput = { ...item.input, quantity: itemQty };
        const calc = calculateMetal(nextInput);
        if (!calc.ok) continue;
        newCalcs.push({
          id: crypto.randomUUID(),
          timestamp: now,
          input: nextInput,
          result: calc.result,
          normalizedProfile: item.normalizedProfile ?? normalizeProfileSnapshot(nextInput),
          assembly: asmTag,
          note: item.note,
        });
      }

      const scaledCosts: ProjectAdditionalCost[] | undefined = template.additionalCosts
        ? template.additionalCosts.map((c) => ({
            id: crypto.randomUUID(),
            label: mult > 1 ? `${c.label} (×${mult})` : c.label,
            amount: Math.round(c.amount * mult * 100) / 100,
            category: c.category,
          }))
        : undefined;

      const project: Project = {
        id: newId,
        name: name.trim() || template.name,
        category: template.category,
        description: template.description,
        createdAt: now,
        updatedAt: now,
        calculations: newCalcs,
        laborHours: template.laborHours ? template.laborHours * mult : undefined,
        laborRatePerHour: 45,
        additionalCosts: scaledCosts,
        activity: [{ id: crypto.randomUUID(), at: now, kind: "created" }],
      };

      setProjects((prev) => [project, ...prev]);
      setActiveProjectId(newId);
      return project;
    },
    [setProjects],
  );

  const removeCalculation = useCallback((projectId: string, calcId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId || p.deletedAt) return p;
        const removed = p.calculations.find((c) => c.id === calcId);
        if (!removed) return p;
        return withActivity(
          { ...p, calculations: p.calculations.filter((c) => c.id !== calcId) },
          "itemRemoved",
          { detail: removed.templateName ?? removed.normalizedProfile.shortLabel },
        );
      }),
    );
  }, [setProjects]);

  /**
   * Edit an item's piece count in place. The stored result is a snapshot, so
   * the quantity is re-run through the engine rather than scaled — waste, VAT
   * and rounding are not linear in quantity and scaling would drift.
   *
   * Template entries hold their own parts and an aggregate result; changing
   * one number there would desync the two, so they are left to the calculator.
   */
  const updateCalculationQuantity = useCallback(
    (projectId: string, calcId: string, quantity: number) => {
      const qty = Math.max(1, Math.floor(quantity));
      if (!Number.isFinite(qty)) return;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || p.deletedAt) return p;
          const target = p.calculations.find((c) => c.id === calcId);
          if (!target || target.templateName) return p;
          const previousQty = target.result.quantity;
          if (previousQty === qty) return p;
          const recalculated = calculateMetal({ ...target.input, quantity: qty });
          if (!recalculated.ok) return p;
          return withActivity(
            {
              ...p,
              calculations: p.calculations.map((c) =>
                c.id === calcId
                  ? { ...c, input: { ...c.input, quantity: qty }, result: recalculated.result }
                  : c,
              ),
            },
            "qtyChanged",
            {
              detail: target.normalizedProfile.shortLabel,
              from: String(previousQty),
              to: String(qty),
            },
          );
        }),
      );
    },
    [setProjects],
  );

  const updateCalculationNote = useCallback((projectId: string, calcId: string, note: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId || p.deletedAt) return p;
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
    updateProjectMeta,
    updateProjectLabor,
    updateProjectAdditionalCosts,
    updateItemAssembly,
    batchArchiveProjects,
    batchDeleteProjects,
    logQuotePrinted,
    deleteProject,
    restoreProject,
    duplicateProject,
    addCalculation,
    addCalculations,
    addTemplateCalculation,
    insertAssemblyTemplate,
    scaleSubAssembly,
    createProjectFromTemplate,
    removeCalculation,
    updateCalculationQuantity,
    updateCalculationNote,
    updateProjectDescription,
    updateProjectPaintCoats,
    projectCount: projects.length,
  };
}
