import { describe, expect, it } from "vitest";
import { calculateMetal } from "@/lib/calculator/engine";
import type { CalculationInput } from "@/lib/calculator/types";
import { getProfileById } from "@/lib/datasets/profiles";
import { toMillimeters } from "@/lib/calculator/units";

interface ProfileCase {
  profileId: CalculationInput["profileId"];
  selectedSizeId?: string;
  manualDimensions: CalculationInput["manualDimensions"];
}

const ROUNDING = {
  weightDecimals: 6,
  priceDecimals: 6,
  dimensionDecimals: 6,
};

const PROFILE_CASES: ProfileCase[] = [
  {
    profileId: "round_bar",
    manualDimensions: { diameter: { value: 40, unit: "mm" } },
  },
  {
    profileId: "square_bar",
    manualDimensions: { side: { value: 35, unit: "mm" } },
  },
  {
    profileId: "flat_bar",
    manualDimensions: {
      width: { value: 120, unit: "mm" },
      thickness: { value: 10, unit: "mm" },
    },
  },
  {
    profileId: "hex_bar",
    manualDimensions: { acrossFlats: { value: 28, unit: "mm" } },
  },
  {
    profileId: "sheet",
    manualDimensions: {
      width: { value: 1250, unit: "mm" },
      thickness: { value: 2.5, unit: "mm" },
    },
  },
  {
    profileId: "plate",
    manualDimensions: {
      width: { value: 1500, unit: "mm" },
      thickness: { value: 16, unit: "mm" },
    },
  },
  {
    profileId: "pipe",
    manualDimensions: {
      outerDiameter: { value: 88.9, unit: "mm" },
      wallThickness: { value: 5, unit: "mm" },
    },
  },
  {
    profileId: "rectangular_tube",
    manualDimensions: {
      width: { value: 120, unit: "mm" },
      height: { value: 80, unit: "mm" },
      wallThickness: { value: 4, unit: "mm" },
    },
  },
  {
    profileId: "angle_equal_en",
    selectedSizeId: "l80x8",
    manualDimensions: {},
  },
  {
    profileId: "channel_upn_en",
    selectedSizeId: "upn120",
    manualDimensions: {},
  },
  {
    profileId: "beam_ipe_en",
    selectedSizeId: "ipe160",
    manualDimensions: {},
  },
  {
    profileId: "tee_en",
    selectedSizeId: "t60x7",
    manualDimensions: {},
  },
];

function relativeError(actual: number, expected: number): number {
  if (expected === 0) {
    return actual === 0 ? 0 : 1;
  }

  return Math.abs(actual - expected) / Math.abs(expected);
}

function computeAreaMm2(testCase: ProfileCase): number {
  switch (testCase.profileId) {
    case "round_bar": {
      const diameter = toMillimeters(testCase.manualDimensions.diameter!.value, testCase.manualDimensions.diameter!.unit);
      return (Math.PI * diameter * diameter) / 4;
    }
    case "square_bar": {
      const side = toMillimeters(testCase.manualDimensions.side!.value, testCase.manualDimensions.side!.unit);
      return side * side;
    }
    case "flat_bar":
    case "sheet":
    case "plate": {
      const width = toMillimeters(testCase.manualDimensions.width!.value, testCase.manualDimensions.width!.unit);
      const thickness = toMillimeters(
        testCase.manualDimensions.thickness!.value,
        testCase.manualDimensions.thickness!.unit,
      );
      return width * thickness;
    }
    case "hex_bar": {
      const acrossFlats = toMillimeters(
        testCase.manualDimensions.acrossFlats!.value,
        testCase.manualDimensions.acrossFlats!.unit,
      );
      return (Math.sqrt(3) / 2) * acrossFlats * acrossFlats;
    }
    case "pipe": {
      const outerDiameter = toMillimeters(
        testCase.manualDimensions.outerDiameter!.value,
        testCase.manualDimensions.outerDiameter!.unit,
      );
      const wallThickness = toMillimeters(
        testCase.manualDimensions.wallThickness!.value,
        testCase.manualDimensions.wallThickness!.unit,
      );
      const innerDiameter = outerDiameter - wallThickness * 2;
      return (Math.PI * (outerDiameter * outerDiameter - innerDiameter * innerDiameter)) / 4;
    }
    case "rectangular_tube": {
      const width = toMillimeters(testCase.manualDimensions.width!.value, testCase.manualDimensions.width!.unit);
      const height = toMillimeters(testCase.manualDimensions.height!.value, testCase.manualDimensions.height!.unit);
      const wallThickness = toMillimeters(
        testCase.manualDimensions.wallThickness!.value,
        testCase.manualDimensions.wallThickness!.unit,
      );
      return width * height - (width - 2 * wallThickness) * (height - 2 * wallThickness);
    }
    default: {
      const profile = getProfileById(testCase.profileId);
      if (!profile || profile.mode !== "standard") {
        return 0;
      }
      return profile.sizes.find((size) => size.id === testCase.selectedSizeId)!.areaMm2;
    }
  }
}

describe("calculateMetal", () => {
  it("keeps deviation <= 0.5% for 200+ benchmark cases", () => {
    const lengthsMm = [1000, 3000, 6000];
    const quantities = [1, 3, 10];
    const wastes = [0, 5];
    const vatPercents = [0, 21];
    const density = 7850;

    let caseCount = 0;

    for (const profileCase of PROFILE_CASES) {
      for (const length of lengthsMm) {
        for (const quantity of quantities) {
          for (const wastePercent of wastes) {
            for (const vatPercent of vatPercents) {
              caseCount += 1;

              const input: CalculationInput = {
                materialGradeId: "steel-s235jr",
                useCustomDensity: false,
                profileId: profileCase.profileId,
                selectedSizeId: profileCase.selectedSizeId,
                manualDimensions: profileCase.manualDimensions,
                length: { value: length, unit: "mm" },
                quantity,
                priceBasis: "weight",
                priceUnit: "kg",
                unitPrice: 2.4,
                currency: "EUR",
                wastePercent,
                includeVat: vatPercent > 0,
                vatPercent,
                rounding: ROUNDING,
              };

              const response = calculateMetal(input);
              expect(response.ok).toBe(true);
              if (!response.ok) {
                continue;
              }

              const areaMm2 = computeAreaMm2(profileCase);
              const unitWeightKg = (areaMm2 * length * density) / 1_000_000_000;
              const wasteMultiplier = 1 + wastePercent / 100;
              const totalWeightKg = unitWeightKg * quantity * wasteMultiplier;
              const subtotal = unitWeightKg * 2.4 * quantity;
              const subtotalWithWaste = subtotal * wasteMultiplier;
              const vatAmount = vatPercent > 0 ? subtotalWithWaste * (vatPercent / 100) : 0;
              const grandTotal = subtotalWithWaste + vatAmount;

              expect(relativeError(response.result.unitWeightKg, unitWeightKg)).toBeLessThanOrEqual(0.005);
              expect(relativeError(response.result.totalWeightKg, totalWeightKg)).toBeLessThanOrEqual(0.005);
              expect(relativeError(response.result.grandTotalAmount, grandTotal)).toBeLessThanOrEqual(0.005);
            }
          }
        }
      }
    }

    expect(caseCount).toBeGreaterThanOrEqual(200);
  });

  it("supports all pricing bases and units", () => {
    const baseInput: CalculationInput = {
      materialGradeId: "steel-s235jr",
      useCustomDensity: false,
      profileId: "round_bar",
      manualDimensions: { diameter: { value: 40, unit: "mm" } },
      length: { value: 6000, unit: "mm" },
      quantity: 2,
      priceBasis: "weight",
      priceUnit: "kg",
      unitPrice: 1.5,
      currency: "EUR",
      wastePercent: 0,
      includeVat: false,
      vatPercent: 21,
      rounding: ROUNDING,
    };

    const weightResponse = calculateMetal(baseInput);
    expect(weightResponse.ok).toBe(true);

    const lengthResponse = calculateMetal({
      ...baseInput,
      priceBasis: "length",
      priceUnit: "m",
      unitPrice: 2.5,
    });
    expect(lengthResponse.ok).toBe(true);

    const pieceResponse = calculateMetal({
      ...baseInput,
      priceBasis: "piece",
      priceUnit: "piece",
      unitPrice: 12,
    });
    expect(pieceResponse.ok).toBe(true);
  });

  it("rejects invalid pipe geometry", () => {
    const response = calculateMetal({
      materialGradeId: "steel-s235jr",
      useCustomDensity: false,
      profileId: "pipe",
      manualDimensions: {
        outerDiameter: { value: 40, unit: "mm" },
        wallThickness: { value: 25, unit: "mm" },
      },
      length: { value: 1000, unit: "mm" },
      quantity: 1,
      priceBasis: "weight",
      priceUnit: "kg",
      unitPrice: 1.5,
      currency: "EUR",
      wastePercent: 0,
      includeVat: false,
      vatPercent: 21,
      rounding: ROUNDING,
    });

    expect(response.ok).toBe(false);
    if (response.ok) {
      return;
    }

    expect(response.issues.some((issue) => issue.field.includes("wallThickness"))).toBe(true);
  });
});
