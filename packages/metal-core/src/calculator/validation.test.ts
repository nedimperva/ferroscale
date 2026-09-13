import { describe, it, expect } from "vitest";
import { calculateMetal } from "./engine";
import type { CalculationInput } from "./types";

describe("surface area keeps its own precision", () => {
  const base: CalculationInput = {
    materialGradeId: "steel-s235jr",
    useCustomDensity: false,
    profileId: "round_bar",
    manualDimensions: { diameter: { value: 40, unit: "mm" } },
    length: { value: 6, unit: "m" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 2.4,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 21,
    rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 0 },
  };

  it("does not round a paint area away when dimensions are whole numbers", () => {
    const res = calculateMetal(base);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Cross-section in mm2 rounds to a whole number, as asked...
    expect(res.result.areaMm2).toBe(1257);
    // ...but 0.754 m2 of paintable surface must not become 1 m2.
    expect(res.result.surfaceAreaM2).toBeCloseTo(0.75, 2);
  });

  it("honours an explicit surfaceDecimals", () => {
    const res = calculateMetal({
      ...base,
      rounding: { ...base.rounding, surfaceDecimals: 4 },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.surfaceAreaM2).toBeCloseTo(0.7540, 4);
  });
});
