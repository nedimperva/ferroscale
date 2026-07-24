import type { UsageSnapshot } from "@/lib/usage-stats";

/**
 * Private, local "your activity" numbers derived from data the app already
 * keeps — no tracking, no network, the user is the only audience. Everything
 * here is a pure function of the usage snapshot plus the library totals, so it
 * stays honest: we report what's actually recorded and nothing we can't back
 * with data (e.g. no per-event history means no "busiest day").
 */

/** A weight/value record — a saved entry or a single project calculation. */
export interface InsightsRecord {
  totalWeightKg: number;
  grandTotalAmount: number;
  currency: string;
}

export interface Insights {
  /** Total sized calculations the app has learned from. */
  calcsRecorded: number;
  /** Distinct settled queries remembered. */
  distinctQueries: number;
  /** Most-used full queries, readable as typed. */
  topQueries: { query: string; count: number }[];
  /** Most-used material grades (by grade id). */
  topGrades: { gradeId: string; count: number }[];
  savedCount: number;
  projectCount: number;
  /** Total weight across the library (saved + project lines). */
  libraryWeightKg: number;
  /** Library value grouped by currency (mixed currencies never summed together). */
  valueByCurrency: { currency: string; amount: number }[];
}

function sumBucketFamily(snapshot: UsageSnapshot, prefix: string): number {
  let total = 0;
  for (const [key, values] of Object.entries(snapshot.buckets)) {
    if (!key.startsWith(prefix)) continue;
    for (const v of Object.values(values)) total += v.n;
  }
  return total;
}

/** Aggregate a bucket namespace ("grade:") by value across all families. */
function aggregateBucketValues(
  snapshot: UsageSnapshot,
  prefix: string,
): { value: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const [key, values] of Object.entries(snapshot.buckets)) {
    if (!key.startsWith(prefix)) continue;
    for (const [value, v] of Object.entries(values)) {
      totals.set(value, (totals.get(value) ?? 0) + v.n);
    }
  }
  return [...totals.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeInsights(
  snapshot: UsageSnapshot,
  records: InsightsRecord[],
  counts: { savedCount: number; projectCount: number },
): Insights {
  const topQueries = [...snapshot.queries]
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((e) => ({ query: e.q, count: e.n }));

  const topGrades = aggregateBucketValues(snapshot, "grade:")
    .slice(0, 5)
    .map(({ value, count }) => ({ gradeId: value, count }));

  let libraryWeightKg = 0;
  const valueMap = new Map<string, number>();
  for (const r of records) {
    if (Number.isFinite(r.totalWeightKg)) libraryWeightKg += r.totalWeightKg;
    if (Number.isFinite(r.grandTotalAmount)) {
      valueMap.set(r.currency, (valueMap.get(r.currency) ?? 0) + r.grandTotalAmount);
    }
  }
  const valueByCurrency = [...valueMap.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    calcsRecorded: sumBucketFamily(snapshot, "size:"),
    distinctQueries: snapshot.queries.length,
    topQueries,
    topGrades,
    savedCount: counts.savedCount,
    projectCount: counts.projectCount,
    libraryWeightKg,
    valueByCurrency,
  };
}
