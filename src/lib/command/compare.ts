import type { CompareItem } from "@/hooks/useCompare";

export interface CompareDelta {
  id: string;
  /** Signed fraction vs heaviest item; 0 for the max. */
  deltaFraction: number;
  /** Pre-formatted label ("—" for max, "+12%" / "-5%" otherwise). */
  label: string;
}

/**
 * Compute each compare item's total-weight delta against a baseline.
 * The baseline is the item whose id is `baselineId`, or — when that is absent
 * or unmatched — the heaviest item (the historical default). The baseline gets
 * the sentinel "—", as does any item that ties it exactly.
 */
export function computeCompareDeltas(
  items: CompareItem[],
  baselineId?: string,
): CompareDelta[] {
  if (items.length === 0) return [];
  const pinned = baselineId
    ? items.find((item) => item.id === baselineId)
    : undefined;
  const baseWeight = pinned
    ? pinned.result.totalWeightKg
    : items.reduce((acc, item) => Math.max(acc, item.result.totalWeightKg), 0);
  if (baseWeight <= 0) {
    return items.map((item) => ({ id: item.id, deltaFraction: 0, label: "—" }));
  }
  return items.map((item) => {
    const fraction = item.result.totalWeightKg / baseWeight - 1;
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
