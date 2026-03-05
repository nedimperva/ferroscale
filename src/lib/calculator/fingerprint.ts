import type { CalculationResult } from "@/lib/calculator/types";

/**
 * Creates a deduplication fingerprint for a calculation result.
 * Used by compare, projects, and history hooks to prevent duplicate entries.
 */
export function fingerprint(result: CalculationResult): string {
  return `${result.profileLabel}|${result.gradeLabel}|${result.grandTotalAmount}|${result.totalWeightKg}`;
}
