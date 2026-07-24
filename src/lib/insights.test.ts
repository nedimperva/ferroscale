import { describe, expect, it } from "vitest";
import type { UsageSnapshot } from "@/lib/usage-stats";
import { computeInsights, type InsightsRecord } from "./insights";

const snapshot: UsageSnapshot = {
  queries: [
    { q: "hea120 6m x2", n: 5, t: 3 },
    { q: "shs40x40x3 6m", n: 8, t: 2 },
    { q: "rnd20 3m", n: 2, t: 1 },
  ],
  buckets: {
    "size:beam": { "120": { n: 5, t: 3 }, "140": { n: 1, t: 2 } },
    "size:shs": { "40x40x3": { n: 8, t: 2 } },
    "grade:beam": { "steel-s235jr": { n: 4, t: 3 } },
    "grade:shs": { "steel-s355": { n: 2, t: 2 }, "steel-s235jr": { n: 1, t: 1 } },
    "len:beam": { "6m": { n: 6, t: 3 } },
  },
};

const records: InsightsRecord[] = [
  { totalWeightKg: 100, grandTotalAmount: 120, currency: "EUR" },
  { totalWeightKg: 50, grandTotalAmount: 60, currency: "EUR" },
  { totalWeightKg: 25, grandTotalAmount: 40, currency: "BAM" },
];

describe("computeInsights", () => {
  const insights = computeInsights(snapshot, records, { savedCount: 2, projectCount: 1 });

  it("sums sized calculations across size buckets only", () => {
    expect(insights.calcsRecorded).toBe(5 + 1 + 8);
  });

  it("counts distinct queries", () => {
    expect(insights.distinctQueries).toBe(3);
  });

  it("ranks the most-used queries", () => {
    expect(insights.topQueries[0]).toEqual({ query: "shs40x40x3 6m", count: 8 });
    expect(insights.topQueries[1]).toEqual({ query: "hea120 6m x2", count: 5 });
  });

  it("aggregates grades across families", () => {
    expect(insights.topGrades[0]).toEqual({ gradeId: "steel-s235jr", count: 5 });
    expect(insights.topGrades[1]).toEqual({ gradeId: "steel-s355", count: 2 });
  });

  it("totals library weight and groups value by currency without mixing", () => {
    expect(insights.libraryWeightKg).toBe(175);
    expect(insights.valueByCurrency).toEqual([
      { currency: "EUR", amount: 180 },
      { currency: "BAM", amount: 40 },
    ]);
  });

  it("passes through library counts", () => {
    expect(insights.savedCount).toBe(2);
    expect(insights.projectCount).toBe(1);
  });

  it("handles an empty snapshot", () => {
    const empty = computeInsights({ queries: [], buckets: {} }, [], { savedCount: 0, projectCount: 0 });
    expect(empty.calcsRecorded).toBe(0);
    expect(empty.topQueries).toEqual([]);
    expect(empty.valueByCurrency).toEqual([]);
  });
});
