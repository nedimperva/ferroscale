import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";

/** What a new project starts from — the four tiles of the dialog's first step. */
export type NewProjectStart =
  | { kind: "blank" }
  | { kind: "assembly"; entry: SavedEntry; multiplier: number }
  | { kind: "copy"; projectId: string }
  | { kind: "import"; items: Array<{ input: CalculationInput; result: CalculationResult }> };

export type NewProjectStartKind = NewProjectStart["kind"];

export interface NewProjectRequest {
  name: string;
  customerId?: string;
  /** ISO date, YYYY-MM-DD; absent for no due date. */
  dueDate?: string;
  start: NewProjectStart;
}

/** Due-date presets, in days from today. null is "no date". */
export const DUE_PRESETS = [7, 14, 30, 60, null] as const;
export type DuePreset = (typeof DUE_PRESETS)[number];

/** Today + days, as a local calendar date — a due date has no clock. */
export function dueDateFromToday(days: number, today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * The name the dialog proposes until the user types one: what it is, then who
 * it is for — "Railing, Marko Group". A copy keeps its source's name.
 */
export function suggestProjectName(
  start: NewProjectStartKind | null,
  subject: string | undefined,
  customerName: string | undefined,
): string {
  const head = start === "blank" || start === "import" ? undefined : subject?.trim();
  return [head, customerName?.trim()].filter(Boolean).join(", ");
}
