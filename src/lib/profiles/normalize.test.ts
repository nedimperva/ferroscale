import { describe, expect, it } from "vitest";
import type { CalculationInput, CurrencyCode, PriceBasis, PriceUnit } from "@/lib/calculator/types";
import type { ProfileId } from "@/lib/datasets/types";
import { normalizeProfileSnapshot } from "./normalize";

function makeInput(profileId: ProfileId): CalculationInput {
  return {
    materialGradeId: "steel_s235jr",
    useCustomDensity: false,
    customDensityKgPerM3: 7850,
    profileId,
    selectedSizeId: undefined,
    manualDimensions: {},
    length: { value: 6000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight" as PriceBasis,
    priceUnit: "kg" as PriceUnit,
    unitPrice: 1,
    currency: "EUR" as CurrencyCode,
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
  };
}

describe("normalizeProfileSnapshot", () => {
  it("formats round tube with OD WT and length", () => {
    const input = makeInput("pipe");
    input.manualDimensions.outerDiameter = { value: 60.3, unit: "mm" };
    input.manualDimensions.wallThickness = { value: 2.8, unit: "mm" };
    input.length = { value: 3400, unit: "mm" };

    const snapshot = normalizeProfileSnapshot(input);

    expect(snapshot.shortLabel).toBe("Round Tube OD 60.3 x WT 2.8 x L 3400 mm");
    expect(snapshot.iconKey).toBe("tubes");
  });

  it("formats sheet with width length and thickness", () => {
    const input = makeInput("sheet");
    input.manualDimensions.width = { value: 1500, unit: "mm" };
    input.manualDimensions.thickness = { value: 10, unit: "mm" };
    input.length = { value: 3000, unit: "mm" };

    const snapshot = normalizeProfileSnapshot(input);

    expect(snapshot.shortLabel).toBe("Sheet 1500 x 3000 x 10 mm");
    expect(snapshot.iconKey).toBe("plates_sheets");
  });

  it("formats standard profile with size and length", () => {
    const input = makeInput("beam_ipe_en");
    input.selectedSizeId = "ipe200";
    input.length = { value: 6, unit: "m" };

    const snapshot = normalizeProfileSnapshot(input);

    expect(snapshot.shortLabel).toBe("IPE 200 x L 6000 mm");
    expect(snapshot.iconKey).toBe("structural");
  });
});
