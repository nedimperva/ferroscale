import { describe, expect, it } from "vitest";
import { validateCalculationInput } from "@/lib/calculator/validation";
import type { CalculationInput } from "@/lib/calculator/types";

/** Minimal valid input for a manual profile (round_bar). */
function makeBaseInput(overrides?: Partial<CalculationInput>): CalculationInput {
  return {
    materialGradeId: "steel-s235jr",
    useCustomDensity: false,
    profileId: "round_bar",
    manualDimensions: { diameter: { value: 30, unit: "mm" } },
    length: { value: 1000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: { weightDecimals: 4, priceDecimals: 2, dimensionDecimals: 2 },
    ...overrides,
  };
}

function fieldNames(issues: { field: string }[]): string[] {
  return issues.map((i) => i.field);
}

describe("validateCalculationInput", () => {
  // ---- Missing required dimensions for manual profiles ----

  describe("missing required dimensions", () => {
    it("flags missing diameter for round_bar", () => {
      const input = makeBaseInput({ manualDimensions: {} });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("manualDimensions.diameter");
    });

    it("flags every missing dimension for flat_bar", () => {
      const input = makeBaseInput({
        profileId: "flat_bar",
        manualDimensions: {},
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("manualDimensions.width");
      expect(fieldNames(issues)).toContain("manualDimensions.thickness");
    });

    it("flags all missing dimensions for pipe", () => {
      const input = makeBaseInput({
        profileId: "pipe",
        manualDimensions: {},
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("manualDimensions.outerDiameter");
      expect(fieldNames(issues)).toContain("manualDimensions.wallThickness");
    });
  });

  // ---- Invalid (negative / zero) dimensions ----

  describe("invalid dimensions", () => {
    it("rejects negative diameter", () => {
      const input = makeBaseInput({
        manualDimensions: { diameter: { value: -10, unit: "mm" } },
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("manualDimensions.diameter");
    });

    it("rejects zero diameter", () => {
      const input = makeBaseInput({
        manualDimensions: { diameter: { value: 0, unit: "mm" } },
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("manualDimensions.diameter");
    });

    it("rejects dimension exceeding max", () => {
      // round_bar diameter maxMm is 600
      const input = makeBaseInput({
        manualDimensions: { diameter: { value: 700, unit: "mm" } },
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("manualDimensions.diameter");
    });
  });

  // ---- Invalid material grade ----

  describe("invalid material grade", () => {
    it("rejects a nonexistent material grade ID", () => {
      const input = makeBaseInput({ materialGradeId: "nonexistent-grade" });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("materialGradeId");
    });

    it("allows any materialGradeId when useCustomDensity is true (with valid density)", () => {
      const input = makeBaseInput({
        materialGradeId: "nonexistent-grade",
        useCustomDensity: true,
        customDensityKgPerM3: 7850,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("materialGradeId");
    });
  });

  // ---- Boundary values for length ----

  describe("length boundaries", () => {
    it("accepts length at 1 mm", () => {
      const input = makeBaseInput({ length: { value: 1, unit: "mm" } });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("length");
    });

    it("accepts length at max 50000 mm", () => {
      const input = makeBaseInput({ length: { value: 50000, unit: "mm" } });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("length");
    });

    it("rejects length of 0 mm", () => {
      const input = makeBaseInput({ length: { value: 0, unit: "mm" } });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("length");
    });

    it("rejects length exceeding 50000 mm", () => {
      const input = makeBaseInput({ length: { value: 50001, unit: "mm" } });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("length");
    });

    it("rejects negative length", () => {
      const input = makeBaseInput({ length: { value: -100, unit: "mm" } });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("length");
    });
  });

  // ---- Boundary values for quantity ----

  describe("quantity boundaries", () => {
    it("accepts quantity of 1", () => {
      const input = makeBaseInput({ quantity: 1 });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("quantity");
    });

    it("accepts quantity at max 10000", () => {
      const input = makeBaseInput({ quantity: 10000 });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("quantity");
    });

    it("rejects quantity of 0", () => {
      const input = makeBaseInput({ quantity: 0 });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("quantity");
    });

    it("rejects negative quantity", () => {
      const input = makeBaseInput({ quantity: -5 });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("quantity");
    });

    it("rejects quantity exceeding 10000", () => {
      const input = makeBaseInput({ quantity: 10001 });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("quantity");
    });

    it("rejects NaN quantity", () => {
      const input = makeBaseInput({ quantity: NaN });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("quantity");
    });
  });

  // ---- Custom density ----

  describe("custom density with useCustomDensity: true", () => {
    it("requires customDensityKgPerM3 when useCustomDensity is true", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: undefined,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("customDensityKgPerM3");
    });

    it("rejects NaN custom density", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: NaN,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("customDensityKgPerM3");
    });

    it("rejects custom density below 100", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: 50,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("customDensityKgPerM3");
      expect(issues.find((i) => i.field === "customDensityKgPerM3")!.messageKey).toBe(
        "validation.customDensityRange",
      );
    });

    it("rejects custom density above 25000", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: 30000,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).toContain("customDensityKgPerM3");
    });

    it("accepts custom density at lower bound (100)", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: 100,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("customDensityKgPerM3");
    });

    it("accepts custom density at upper bound (25000)", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: 25000,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("customDensityKgPerM3");
    });

    it("accepts a valid custom density (7850)", () => {
      const input = makeBaseInput({
        useCustomDensity: true,
        customDensityKgPerM3: 7850,
      });
      const issues = validateCalculationInput(input);
      expect(fieldNames(issues)).not.toContain("customDensityKgPerM3");
    });
  });

  // ---- Valid input produces no issues ----

  it("returns no issues for a fully valid input", () => {
    const input = makeBaseInput();
    const issues = validateCalculationInput(input);
    expect(issues).toHaveLength(0);
  });
});
