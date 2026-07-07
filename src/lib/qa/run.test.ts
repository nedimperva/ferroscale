import { describe, it, expect } from "vitest";
import { runFormulaQa } from "./run";

describe("formula QA benchmark", () => {
  it("every reference row passes within tolerance against the live engine", () => {
    const report = runFormulaQa();
    const failing = report.rows
      .filter((r) => !r.pass)
      .map((r) => `${r.row.label}: expected ${r.row.expectedKgPerM}, got ${r.actualKgPerM} (${r.deltaPct?.toFixed(2)}%)`);
    expect(failing, failing.join("\n")).toEqual([]);
    expect(report.allPass).toBe(true);
    expect(report.rows.length).toBeGreaterThanOrEqual(20);
    expect(report.maxDeltaPct).toBeLessThanOrEqual(report.tolerancePct);
  });
});
