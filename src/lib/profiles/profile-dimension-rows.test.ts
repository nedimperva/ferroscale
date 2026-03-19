import { describe, it, expect } from "vitest";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CalculationResult } from "@/lib/calculator/types";
import { buildProfileDimensionRows } from "./profile-dimension-rows";

const baseInput: CalculationInput = {
  materialGradeId: "steel-s235jr",
  useCustomDensity: false,
  profileId: "round_bar",
  manualDimensions: { diameter: { value: 40, unit: "mm" } },
  length: { value: 6000, unit: "mm" },
  quantity: 1,
  priceBasis: "weight",
  priceUnit: "kg",
  unitPrice: 2,
  currency: "EUR",
  wastePercent: 0,
  includeVat: false,
  vatPercent: 21,
  rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 3 },
};

const baseResult = {
  profileId: "round_bar" as const,
  profileLabel: "Round Bar",
  gradeLabel: "S235JR",
  densityKgPerM3: 7850,
  areaMm2: 1256.637,
  lengthMm: 6000,
  quantity: 1,
  unitWeightKg: 59,
  totalWeightKg: 59,
  totalWeightLb: 130,
  unitPriceAmount: 2,
  subtotalAmount: 118,
  wasteAmount: 0,
  subtotalWithWasteAmount: 118,
  vatAmount: 0,
  grandTotalAmount: 118,
  currency: "EUR" as const,
  priceBasis: "weight" as const,
  priceUnit: "kg" as const,
  formulaLabel: "A = π × d² / 4",
  datasetVersion: "1",
  referenceLabels: [],
  breakdownRows: [],
  surfaceAreaM2: null,
  unitSurfaceAreaM2: null,
} satisfies CalculationResult;

describe("buildProfileDimensionRows", () => {
  it("includes manual dimensions, A, and L for round bar", () => {
    const rows = buildProfileDimensionRows(baseInput, baseResult);
    expect(rows.some((r) => r.kind === "manual" && r.key === "diameter")).toBe(true);
    expect(rows.some((r) => r.kind === "derived" && r.key === "A")).toBe(true);
    expect(rows.some((r) => r.kind === "derived" && r.key === "L")).toBe(true);
  });

  it("adds designation for standard profile", () => {
    const input: CalculationInput = {
      ...baseInput,
      profileId: "beam_ipe_en",
      manualDimensions: {},
      selectedSizeId: "ipe200",
    };
    const res = { ...baseResult, profileId: "beam_ipe_en" as const };
    const rows = buildProfileDimensionRows(input, res);
    expect(rows.some((r) => r.kind === "designation")).toBe(true);
  });
});
