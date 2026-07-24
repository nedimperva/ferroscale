import { describe, expect, it } from "vitest";
import type { CalculationResult } from "@/lib/calculator/types";
import { daysSince, isStaleSaved, STALE_AFTER_DAYS, suggestTags } from "./tags";

function result(overrides: Partial<CalculationResult> = {}): CalculationResult {
  return {
    profileLabel: "HEA 120",
    gradeLabel: "S235JR",
    grandTotalAmount: 100,
    totalWeightKg: 50,
    quantity: 1,
    currency: "EUR",
    ...overrides,
  } as unknown as CalculationResult;
}

describe("suggestTags", () => {
  it("derives family + grade tags", () => {
    expect(suggestTags(result())).toEqual(["HEA", "S235JR"]);
  });

  it("uses the first token of a multi-word profile label", () => {
    expect(suggestTags(result({ profileLabel: "Flat 40×4" }))).toEqual(["Flat", "S235JR"]);
  });

  it("skips missing grade and empty labels", () => {
    expect(suggestTags(result({ gradeLabel: "" }))).toEqual(["HEA"]);
    expect(suggestTags(result({ profileLabel: "  ", gradeLabel: "S355" }))).toEqual(["S355"]);
  });

  it("deduplicates case-insensitively and caps at two", () => {
    expect(suggestTags(result({ profileLabel: "S235 bar", gradeLabel: "s235" }))).toEqual(["S235"]);
  });

  it("ignores a purely numeric leading token", () => {
    expect(suggestTags(result({ profileLabel: "120 plate", gradeLabel: "S235" }))).toEqual(["S235"]);
  });
});

describe("daysSince", () => {
  const now = Date.parse("2026-07-24T00:00:00.000Z");
  it("counts whole days and clamps future/invalid to 0", () => {
    expect(daysSince("2026-07-14T00:00:00.000Z", now)).toBe(10);
    expect(daysSince("2027-01-01T00:00:00.000Z", now)).toBe(0);
    expect(daysSince(undefined, now)).toBe(0);
    expect(daysSince("not-a-date", now)).toBe(0);
  });
});

describe("isStaleSaved", () => {
  const now = Date.parse("2026-07-24T00:00:00.000Z");
  const old = "2025-01-01T00:00:00.000Z"; // well over 6 months earlier

  it("flags an unused, aged save", () => {
    expect(isStaleSaved({ useCount: 0, timestamp: old }, now)).toBe(true);
  });

  it("never flags a reused save", () => {
    expect(isStaleSaved({ useCount: 3, timestamp: old }, now)).toBe(false);
  });

  it("never flags a fresh save", () => {
    const fresh = "2026-07-01T00:00:00.000Z";
    expect(isStaleSaved({ useCount: 0, timestamp: fresh }, now)).toBe(false);
  });

  it("resets the clock on lastUsedAt", () => {
    expect(
      isStaleSaved({ useCount: 0, timestamp: old, lastUsedAt: "2026-07-20T00:00:00.000Z" }, now),
    ).toBe(false);
  });

  it("uses exactly STALE_AFTER_DAYS as the boundary", () => {
    const boundary = now - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
    expect(isStaleSaved({ useCount: 0, timestamp: new Date(boundary).toISOString() }, now)).toBe(true);
  });
});
