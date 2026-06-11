import type { CompareItem } from "@/hooks/useCompare";

export interface CompareDelta {
  id: string;
  /** Signed fraction vs heaviest item; 0 for the max. */
  deltaFraction: number;
  /** Pre-formatted label ("—" for max, "+12%" / "-5%" otherwise). */
  label: string;
}

/**
 * Compute each compare item's total-weight delta vs the heaviest item.
 * The heaviest item gets the sentinel "—". Items sharing the max weight
 * are all labeled "—" too (no ambiguity about who's the baseline).
 */
export function computeCompareDeltas(items: CompareItem[]): CompareDelta[] {
  if (items.length === 0) return [];
  const max = items.reduce(
    (acc, item) => Math.max(acc, item.result.totalWeightKg),
    0,
  );
  if (max <= 0) {
    return items.map((item) => ({ id: item.id, deltaFraction: 0, label: "—" }));
  }
  return items.map((item) => {
    const fraction = item.result.totalWeightKg / max - 1;
    if (Math.abs(fraction) < 1e-9) {
      return { id: item.id, deltaFraction: 0, label: "—" };
    }
    const pct = Math.round(fraction * 100);
    if (pct === 0) {
      return { id: item.id, deltaFraction: fraction, label: "—" };
    }
    const sign = pct > 0 ? "+" : "";
    return { id: item.id, deltaFraction: fraction, label: `${sign}${pct}%` };
  });
}
