import { describe, it, expect } from "vitest";
import { fingerprint } from "./fingerprint";
import type { CalculationResult } from "./types";

const makeResult = (overrides: Partial<CalculationResult> = {}): CalculationResult => ({
  profileId: "round_bar",
  profileLabel: "Round Bar",
  gradeLabel: "S235JR",
  quantity: 1,
  length: 1000,
  unitWeightKg: 6.17,
  totalWeightKg: 6.17,
  subtotalAmount: 0,
  wasteAmount: 0,
  vatAmount: 0,
  grandTotalAmount: 0,
  currency: "EUR",
  datasetVersion: "1.0.0",
  ...overrides,
} as CalculationResult);

describe("fingerprint", () => {
  it("produces a consistent fingerprint for the same result", () => {
    const result = makeResult();
    expect(fingerprint(result)).toBe(fingerprint(result));
  });

  it("differs when profileLabel changes", () => {
    const a = makeResult({ profileLabel: "Round Bar" });
    const b = makeResult({ profileLabel: "Square Bar" });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it("differs when gradeLabel changes", () => {
    const a = makeResult({ gradeLabel: "S235JR" });
    const b = makeResult({ gradeLabel: "S355JR" });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it("differs when grandTotalAmount changes", () => {
    const a = makeResult({ grandTotalAmount: 100 });
    const b = makeResult({ grandTotalAmount: 200 });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it("differs when totalWeightKg changes", () => {
    const a = makeResult({ totalWeightKg: 6.17 });
    const b = makeResult({ totalWeightKg: 12.34 });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it("includes all four fields in the fingerprint string", () => {
    const result = makeResult({
      profileLabel: "IPE 200",
      gradeLabel: "S275JR",
      grandTotalAmount: 42.5,
      totalWeightKg: 22.4,
    });
    const fp = fingerprint(result);
    expect(fp).toContain("IPE 200");
    expect(fp).toContain("S275JR");
    expect(fp).toContain("42.5");
    expect(fp).toContain("22.4");
  });
});
