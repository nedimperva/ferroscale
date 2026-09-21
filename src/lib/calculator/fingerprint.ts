import type { CalculationResult } from "@/lib/calculator/types";

/**
 * Creates a deduplication fingerprint for a calculation result.
 * Used by compare, projects, and history hooks to prevent duplicate entries.
 */
export function fingerprint(result: CalculationResult): string {
  return `${result.profileLabel}|${result.gradeLabel}|${result.grandTotalAmount}|${result.totalWeightKg}`;
}

/**
 * Identity of a *saved* calculation: geometry and material only, never price.
 *
 * A saved entry is re-priced at the current rate every time it's shown, so
 * money can't be part of what makes it "the same one" — otherwise re-saving a
 * restored entry after a rate change would silently pile up duplicates, and
 * the Save toggle would show unsaved for a line that is, in fact, saved.
 * Length and quantity ride along so 2 × 6 m and 4 × 3 m stay distinct despite
 * weighing the same.
 */
export function savedFingerprint(result: CalculationResult): string {
  return [
    result.profileLabel,
    result.gradeLabel,
    result.totalWeightKg,
    result.lengthMm,
    result.quantity,
  ].join("|");
}

