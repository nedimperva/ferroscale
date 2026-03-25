import type { CalculationResult } from "@/lib/calculator/types";

/**
 * Creates a deduplication fingerprint for a calculation result.
 * Used by compare, projects, and history hooks to prevent duplicate entries.
 */
export function fingerprint(result: CalculationResult): string {
  return `${result.profileLabel}|${result.gradeLabel}|${result.grandTotalAmount}|${result.totalWeightKg}`;
}

/**
 * Creates a deduplication fingerprint for a template added to a project.
 * Uses the template name + aggregated totals to prevent duplicate template entries.
 */
export function templateFingerprint(name: string, totalWeight: number, totalCost: number): string {
  return `template|${name}|${totalCost}|${totalWeight}`;
}
