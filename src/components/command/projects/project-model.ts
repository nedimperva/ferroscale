import { CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import type { CurrencyCode } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import {
  computeAggregates,
  projectStatus,
  type Project,
  type ProjectActivityEntry,
  type ProjectAdditionalCost,
  type ProjectCalculation,
  type ProjectCategory,
  type ProjectStatus,
} from "@/hooks/useProjects";

/**
 * Everything the Projects list and the project detail page render, derived
 * once per project. Both surfaces (the wide workspace and the library sheet)
 * read the same rows, so a column means the same thing wherever you see it.
 */

type CommandT = (key: string, values?: Record<string, string | number>) => string;

/**
 * "2 h ago" — coarse on purpose. A project list wants to say "recent" or
 * "a while back"; anything finer is noise that changes on every render.
 */
export function formatRelativeTime(iso: string | undefined, t: CommandT): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 2) return t("time.justNow");
  if (minutes < 60) return t("time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days <= 14) return t("time.days", { count: days });
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatShortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** An `<input type="date">` wants YYYY-MM-DD and nothing else. */
export function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export interface ProjectItemRow {
  calc: ProjectCalculation;
  id: string;
  specLabel: string;
  gradeLabel: string;
  /** "6.000 m", or "—" for items with no length (plate, piece). */
  lengthLabel: string;
  quantity: number;
  weightKg: number;
  amount: number;
  note?: string;
  assembly?: string;
  profileId?: string;
  normalizedProfile?: NormalizedProfileSnapshot;
  /** Templates hold their own parts; their quantity is not editable here. */
  isTemplate: boolean;
}

function formatLengthM(mm: number | undefined): string {
  if (!mm || mm <= 0) return "—";
  return `${(mm / 1000).toFixed(3)} m`;
}

export function projectItemRows(project: Project): ProjectItemRow[] {
  return project.calculations.map((calc) => ({
    calc,
    id: calc.id,
    specLabel:
      calc.templateName ?? calc.normalizedProfile?.shortLabel ?? calc.result.profileLabel,
    gradeLabel: calc.templateName ? "—" : (calc.result.gradeLabel ?? "—"),
    lengthLabel: calc.templateName ? "—" : formatLengthM(calc.result.lengthMm),
    // A template's own result carries the first part's piece count; the number
    // that means anything about the entry is how many of the assembly went in.
    quantity: calc.templateName ? (calc.quantityMultiplier ?? 1) : calc.result.quantity,
    weightKg: calc.result.totalWeightKg,
    amount: calc.result.grandTotalAmount,
    note: calc.note,
    assembly: calc.assembly,
    profileId: calc.input?.profileId,
    normalizedProfile: calc.normalizedProfile,
    isTemplate: Boolean(calc.templateName),
  }));
}

export interface ProjectSummary {
  project: Project;
  status: ProjectStatus;
  category?: ProjectCategory;
  itemCount: number;
  totalWeightKg: number;
  totalCost: number;
  /** Material cost plus the margin the quote adds on top. */
  materialQuotedTotal: number;
  /** Effective margin percentage (project override or global default). */
  marginPercent: number;
  laborHours: number;
  laborRatePerHour: number;
  laborCost: number;
  hasLabor: boolean;
  additionalCosts: ProjectAdditionalCost[];
  additionalCostsTotal: number;
  hasAdditionalCosts: boolean;
  paintKgNeeded: number;
  paintingCost: number;
  totalSurfaceAreaM2: number;
  paintCoatTotals: ReturnType<typeof computeAggregates>["paintCoatTotals"];
  /** Quoted material plus painting, when a paint rate is set. */
  quotedWithPaint: number;
  /** Grand Total Quote (Material + Paint + Labor + Extras). */
  quotedTotal: number;
  hasPainting: boolean;
  currency: CurrencyCode;
  currencySymbol: string;
  isEmpty: boolean;
}

export function projectSummary(project: Project, globalMarginPercent: number): ProjectSummary {
  const aggregates = computeAggregates(project);
  const effectiveMargin = project.marginPercent !== undefined ? project.marginPercent : globalMarginPercent;
  const materialQuotedTotal = Math.round(aggregates.totalCost * (1 + effectiveMargin / 100) * 100) / 100;
  
  const laborHours = project.laborHours ?? 0;
  const laborRatePerHour = project.laborRatePerHour ?? 0;
  const laborCost = Math.round(laborHours * laborRatePerHour * 100) / 100;
  
  const additionalCosts = project.additionalCosts ?? [];
  const additionalCostsTotal = Math.round(additionalCosts.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  
  const paintingCost = aggregates.totalPaintingCost;
  const hasPainting = (project.paintCoats?.length ?? 0) > 0 && paintingCost > 0;
  
  const grandTotal = Math.round((materialQuotedTotal + paintingCost + laborCost + additionalCostsTotal) * 100) / 100;

  return {
    project,
    status: projectStatus(project),
    category: project.category,
    itemCount: aggregates.count,
    totalWeightKg: aggregates.totalWeightKg,
    totalCost: aggregates.totalCost,
    materialQuotedTotal,
    marginPercent: effectiveMargin,
    laborHours,
    laborRatePerHour,
    laborCost,
    hasLabor: laborCost > 0,
    additionalCosts,
    additionalCostsTotal,
    hasAdditionalCosts: additionalCostsTotal > 0,
    paintKgNeeded: aggregates.paintKgNeeded,
    paintingCost,
    totalSurfaceAreaM2: aggregates.totalSurfaceAreaM2,
    paintCoatTotals: aggregates.paintCoatTotals,
    quotedWithPaint: Math.round((materialQuotedTotal + paintingCost) * 100) / 100,
    quotedTotal: grandTotal,
    hasPainting,
    currency: aggregates.currency,
    currencySymbol: CURRENCY_SYMBOLS[aggregates.currency] ?? "€",
    isEmpty: aggregates.count === 0,
  };
}

/**
 * An activity line, rendered from its kind rather than stored as a sentence.
 * "Client set to —" reads badly, so clearing a field has its own message.
 */
export function formatActivity(entry: ProjectActivityEntry, t: CommandT): string {
  const values = {
    detail: entry.detail ?? "",
    from: entry.from ?? "",
    to: entry.to ?? "",
  };
  if (entry.kind === "clientSet" && !entry.to) return t("projects.activity.clientCleared");
  if (entry.kind === "dueDateSet" && !entry.to) return t("projects.activity.dueDateCleared");
  if (entry.kind === "statusChanged") {
    return t("projects.activity.statusChanged", {
      from: entry.from ? t(`projects.status.${entry.from}`) : "",
      to: entry.to ? t(`projects.status.${entry.to}`) : "",
    });
  }
  return t(`projects.activity.${entry.kind}`, values);
}
