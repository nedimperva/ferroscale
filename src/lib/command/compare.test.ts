import { describe, it, expect } from "vitest";
import { computeCompareDeltas } from "./compare";
import type { CompareItem } from "@/hooks/useCompare";
import type { CalculationResult } from "@/lib/calculator/types";

function mk(id: string, totalWeightKg: number): CompareItem {
  // Only the fields computeCompareDeltas reads need to be real.
  const result = { totalWeightKg } as unknown as CalculationResult;
  return {
    id,
    timestamp: "2026-06-09T00:00:00.000Z",
    input: {} as CompareItem["input"],
    result,
    normalizedProfile: {} as CompareItem["normalizedProfile"],
  };
}

describe("computeCompareDeltas", () => {
  it("returns an empty array for no items", () => {
    expect(computeCompareDeltas([])).toEqual([]);
  });

  it("marks the heaviest item with '—' and others with signed percent", () => {
    const out = computeCompareDeltas([
      mk("a", 100),
      mk("b", 80),
      mk("c", 50),
    ]);
    expect(out.find((d) => d.id === "a")?.label).toBe("—");
    expect(out.find((d) => d.id === "b")?.label).toBe("-20%");
    expect(out.find((d) => d.id === "c")?.label).toBe("-50%");
  });

  it("labels all items '—' when they share the max", () => {
    const out = computeCompareDeltas([mk("a", 100), mk("b", 100)]);
    expect(out.map((d) => d.label)).toEqual(["—", "—"]);
  });

  it("handles all-zero weights gracefully", () => {
    const out = computeCompareDeltas([mk("a", 0), mk("b", 0)]);
    expect(out.every((d) => d.label === "—")).toBe(true);
  });

  it("rounds to whole percent", () => {
    const out = computeCompareDeltas([mk("a", 100), mk("b", 87.4)]);
    expect(out.find((d) => d.id === "b")?.label).toBe("-13%");
  });
});
