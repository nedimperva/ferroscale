import { describe, it, expect } from "vitest";
import { runFormulaQa } from "./run";
import { QA_BENCHMARK_ROWS, QA_UNVERIFIED_SIZES } from "./benchmark";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles/index";

describe("formula QA benchmark", () => {
  it("every reference row passes within tolerance against the live engine", () => {
    const report = runFormulaQa();
    const failing = report.rows
      .filter((r) => !r.pass)
      .map((r) => `${r.row.label}: expected ${r.row.expectedKgPerM}, got ${r.actualKgPerM} (${r.deltaPct?.toFixed(2)}%)`);
    expect(failing, failing.join("\n")).toEqual([]);
    expect(report.allPass).toBe(true);
    expect(report.rows.length).toBeGreaterThanOrEqual(140);
    expect(report.maxDeltaPct).toBeLessThanOrEqual(report.tolerancePct);
  });
});

describe("formula QA coverage", () => {
  it("every EN standard size has an independent reference, or is a named exception", () => {
    const covered = new Set(
      QA_BENCHMARK_ROWS.filter((row) => row.selectedSizeId).map(
        (row) => `${row.profileId}/${row.selectedSizeId}`,
      ),
    );
    const uncovered = PROFILE_DEFINITIONS.flatMap((profile) =>
      profile.mode === "standard"
        ? profile.sizes.map((size) => `${profile.id}/${size.id}`)
        : [],
    ).filter((key) => !covered.has(key) && !QA_UNVERIFIED_SIZES.includes(key));

    expect(
      uncovered,
      `These EN sizes ship with no independent check. Add each one's published ` +
        `catalog mass to QA_BENCHMARK_ROWS:\n${uncovered.join("\n")}`,
    ).toEqual([]);
  });

  it("the unverified list stays short and stays honest", () => {
    // Every entry here is a real disagreement between the stored area and the
    // published catalog mass. They are exempt from the gate, not from the fix.
    expect(QA_UNVERIFIED_SIZES.length).toBeLessThanOrEqual(7);
    for (const key of QA_UNVERIFIED_SIZES) {
      const [profileId, sizeId] = key.split("/");
      const profile = PROFILE_DEFINITIONS.find((p) => p.id === profileId);
      expect(profile, `${key} is not a real profile`).toBeDefined();
      expect(
        profile?.mode === "standard" && profile.sizes.some((s) => s.id === sizeId),
        `${key} is not a real size - drop it from the unverified list`,
      ).toBe(true);
    }
  });
});
