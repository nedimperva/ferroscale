import { describe, expect, it } from "vitest";
import {
  solveForDimension,
  solveForQuantity,
  getSolvableDimensions,
  type ReverseResponse,
  type QuantityResponse,
} from "@/lib/calculator/reverse";
import { calculateMetal } from "@/lib/calculator/engine";
import type { CalculationInput } from "@/lib/calculator/types";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STEEL_DENSITY = 7850; // kg/m3

const ROUNDING = {
  weightDecimals: 6,
  priceDecimals: 6,
  dimensionDecimals: 6,
};

function expectOk(r: ReverseResponse): asserts r is Extract<ReverseResponse, { ok: true }> {
  expect(r.ok).toBe(true);
}

function expectErr(r: ReverseResponse): asserts r is Extract<ReverseResponse, { ok: false }> {
  expect(r.ok).toBe(false);
}

function expectQtyOk(r: QuantityResponse): asserts r is Extract<QuantityResponse, { ok: true }> {
  expect(r.ok).toBe(true);
}

function expectQtyErr(r: QuantityResponse): asserts r is Extract<QuantityResponse, { ok: false }> {
  expect(r.ok).toBe(false);
}

/** Compute forward weight (kg) for a given area, length, qty, waste, density. */
function forwardWeight(areaMm2: number, lengthMm: number, qty: number, wastePercent: number, density: number): number {
  const unitWeight = (areaMm2 * lengthMm / 1_000_000_000) * density;
  return unitWeight * qty * (1 + wastePercent / 100);
}

/* ------------------------------------------------------------------ */
/*  solveForDimension - per profile                                    */
/* ------------------------------------------------------------------ */

describe("solveForDimension", () => {
  const baseDimParams = {
    densityKgPerM3: STEEL_DENSITY,
    lengthMm: 6000,
    quantity: 2,
    wastePercent: 5,
  };

  describe("round_bar - diameter", () => {
    it("solves for diameter from known weight", () => {
      const diameter = 50;
      const area = (Math.PI * diameter * diameter) / 4;
      const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

      const result = solveForDimension({
        ...baseDimParams,
        profileId: "round_bar",
        targetWeightKg: weight,
        solveDimension: "diameter",
        knownDimensions: {},
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(diameter, 6);
    });

    it("returns error for unsupported dimension", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "round_bar",
        targetWeightKg: 10,
        solveDimension: "width",
        knownDimensions: {},
      });

      expectErr(result);
    });
  });

  describe("square_bar - side", () => {
    it("solves for side from known weight", () => {
      const side = 35;
      const area = side * side;
      const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

      const result = solveForDimension({
        ...baseDimParams,
        profileId: "square_bar",
        targetWeightKg: weight,
        solveDimension: "side",
        knownDimensions: {},
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(side, 6);
    });
  });

  describe("flat_bar - width, thickness", () => {
    const width = 120;
    const thickness = 10;
    const area = width * thickness;
    const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

    it("solves for width given thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "flat_bar",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: { thickness },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(width, 6);
    });

    it("solves for thickness given width", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "flat_bar",
        targetWeightKg: weight,
        solveDimension: "thickness",
        knownDimensions: { width },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(thickness, 6);
    });

    it("returns error when solving width without thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "flat_bar",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: {},
      });

      expectErr(result);
    });
  });

  describe("sheet - width, thickness", () => {
    it("solves for width given thickness", () => {
      const width = 1250;
      const thickness = 2.5;
      const area = width * thickness;
      const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

      const result = solveForDimension({
        ...baseDimParams,
        profileId: "sheet",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: { thickness },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(width, 6);
    });

    it("solves for thickness given width", () => {
      const width = 1250;
      const thickness = 2.5;
      const area = width * thickness;
      const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

      const result = solveForDimension({
        ...baseDimParams,
        profileId: "sheet",
        targetWeightKg: weight,
        solveDimension: "thickness",
        knownDimensions: { width },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(thickness, 6);
    });
  });

  describe("plate - width, thickness", () => {
    it("solves for width given thickness", () => {
      const width = 1500;
      const thickness = 16;
      const area = width * thickness;
      const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

      const result = solveForDimension({
        ...baseDimParams,
        profileId: "plate",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: { thickness },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(width, 6);
    });

    it("solves for thickness given width", () => {
      const width = 1500;
      const thickness = 16;
      const area = width * thickness;
      const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

      const result = solveForDimension({
        ...baseDimParams,
        profileId: "plate",
        targetWeightKg: weight,
        solveDimension: "thickness",
        knownDimensions: { width },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(thickness, 6);
    });
  });

  describe("pipe - wallThickness, outerDiameter", () => {
    const OD = 88.9;
    const t = 5;
    const area = Math.PI * t * (OD - t);
    const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

    it("solves for wallThickness given outerDiameter", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "pipe",
        targetWeightKg: weight,
        solveDimension: "wallThickness",
        knownDimensions: { outerDiameter: OD },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(t, 4);
    });

    it("solves for outerDiameter given wallThickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "pipe",
        targetWeightKg: weight,
        solveDimension: "outerDiameter",
        knownDimensions: { wallThickness: t },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(OD, 4);
    });

    it("returns error when solving wallThickness without outerDiameter", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "pipe",
        targetWeightKg: weight,
        solveDimension: "wallThickness",
        knownDimensions: {},
      });

      expectErr(result);
    });
  });

  describe("rectangular_tube - wallThickness, width, height", () => {
    const W = 120;
    const H = 80;
    const t = 4;
    const area = W * H - (W - 2 * t) * (H - 2 * t);
    const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

    it("solves for wallThickness given width and height", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "rectangular_tube",
        targetWeightKg: weight,
        solveDimension: "wallThickness",
        knownDimensions: { width: W, height: H },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(t, 4);
    });

    it("solves for width given height and wallThickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "rectangular_tube",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: { height: H, wallThickness: t },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(W, 4);
    });

    it("solves for height given width and wallThickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "rectangular_tube",
        targetWeightKg: weight,
        solveDimension: "height",
        knownDimensions: { width: W, wallThickness: t },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(H, 4);
    });

    it("returns error when solving wallThickness without width", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "rectangular_tube",
        targetWeightKg: weight,
        solveDimension: "wallThickness",
        knownDimensions: { height: H },
      });

      expectErr(result);
    });
  });

  describe("square_hollow - side, wallThickness", () => {
    const side = 100;
    const t = 5;
    const area = 4 * t * (side - t);
    const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

    it("solves for wallThickness given side", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "square_hollow",
        targetWeightKg: weight,
        solveDimension: "wallThickness",
        knownDimensions: { side },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(t, 4);
    });

    it("solves for side given wallThickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "square_hollow",
        targetWeightKg: weight,
        solveDimension: "side",
        knownDimensions: { wallThickness: t },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(side, 4);
    });

    it("returns error when solving wallThickness without side", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "square_hollow",
        targetWeightKg: weight,
        solveDimension: "wallThickness",
        knownDimensions: {},
      });

      expectErr(result);
    });
  });

  describe("angle - legA, legB, thickness", () => {
    const legA = 80;
    const legB = 60;
    const t = 8;
    const area = (legA + legB - t) * t;
    const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

    it("solves for legA given legB and thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "angle",
        targetWeightKg: weight,
        solveDimension: "legA",
        knownDimensions: { legB, thickness: t },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(legA, 4);
    });

    it("solves for legB given legA and thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "angle",
        targetWeightKg: weight,
        solveDimension: "legB",
        knownDimensions: { legA, thickness: t },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(legB, 4);
    });

    it("solves for thickness given legA and legB", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "angle",
        targetWeightKg: weight,
        solveDimension: "thickness",
        knownDimensions: { legA, legB },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(t, 4);
    });

    it("returns error when solving legA without thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "angle",
        targetWeightKg: weight,
        solveDimension: "legA",
        knownDimensions: { legB },
      });

      expectErr(result);
    });
  });

  describe("chequered_plate - width, thickness, patternHeight", () => {
    const width = 1500;
    const thickness = 5;
    const patternHeight = 2;
    const area = width * (thickness + patternHeight * 0.5);
    const weight = forwardWeight(area, 6000, 2, 5, STEEL_DENSITY);

    it("solves for width given thickness and patternHeight", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "chequered_plate",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: { thickness, patternHeight },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(width, 4);
    });

    it("solves for thickness given width and patternHeight", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "chequered_plate",
        targetWeightKg: weight,
        solveDimension: "thickness",
        knownDimensions: { width, patternHeight },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(thickness, 4);
    });

    it("solves for patternHeight given width and thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "chequered_plate",
        targetWeightKg: weight,
        solveDimension: "patternHeight",
        knownDimensions: { width, thickness },
      });

      expectOk(result);
      expect(result.valueMm).toBeCloseTo(patternHeight, 4);
    });

    it("returns error when solving width without thickness", () => {
      const result = solveForDimension({
        ...baseDimParams,
        profileId: "chequered_plate",
        targetWeightKg: weight,
        solveDimension: "width",
        knownDimensions: { patternHeight },
      });

      expectErr(result);
    });
  });

  /* ── Input validation errors ── */

  describe("input validation", () => {
    const validParams = {
      profileId: "round_bar" as ProfileId,
      targetWeightKg: 10,
      densityKgPerM3: STEEL_DENSITY,
      lengthMm: 6000,
      quantity: 1,
      wastePercent: 0,
      solveDimension: "diameter" as DimensionKey,
      knownDimensions: {},
    };

    it("rejects zero target weight", () => {
      const result = solveForDimension({ ...validParams, targetWeightKg: 0 });
      expectErr(result);
      expect(result.message).toMatch(/weight/i);
    });

    it("rejects negative target weight", () => {
      const result = solveForDimension({ ...validParams, targetWeightKg: -5 });
      expectErr(result);
    });

    it("rejects zero density", () => {
      const result = solveForDimension({ ...validParams, densityKgPerM3: 0 });
      expectErr(result);
      expect(result.message).toMatch(/density/i);
    });

    it("rejects negative density", () => {
      const result = solveForDimension({ ...validParams, densityKgPerM3: -100 });
      expectErr(result);
    });

    it("rejects zero length", () => {
      const result = solveForDimension({ ...validParams, lengthMm: 0 });
      expectErr(result);
      expect(result.message).toMatch(/length/i);
    });

    it("rejects negative length", () => {
      const result = solveForDimension({ ...validParams, lengthMm: -1000 });
      expectErr(result);
    });

    it("rejects zero quantity", () => {
      const result = solveForDimension({ ...validParams, quantity: 0 });
      expectErr(result);
      expect(result.message).toMatch(/quantity/i);
    });

    it("rejects negative quantity", () => {
      const result = solveForDimension({ ...validParams, quantity: -1 });
      expectErr(result);
    });

    it("returns error for unsupported profile", () => {
      const result = solveForDimension({
        ...validParams,
        profileId: "beam_ipe_en" as ProfileId,
        solveDimension: "diameter",
      });
      expectErr(result);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  solveForQuantity                                                   */
/* ------------------------------------------------------------------ */

describe("solveForQuantity", () => {
  const baseParams = {
    densityKgPerM3: STEEL_DENSITY,
    lengthMm: 6000,
    wastePercent: 0,
  };

  it("returns correct exact and whole quantity for basic case", () => {
    const areaMm2 = (Math.PI * 40 * 40) / 4; // round bar d=40
    const unitWeight = (areaMm2 * 6000 / 1_000_000_000) * STEEL_DENSITY;
    const targetWeight = unitWeight * 5; // exactly 5 pieces

    const result = solveForQuantity({
      ...baseParams,
      areaMm2,
      targetWeightKg: targetWeight,
    });

    expectQtyOk(result);
    expect(result.exactQuantity).toBeCloseTo(5, 6);
    expect(result.wholeQuantity).toBe(5);
    expect(result.unitWeightKg).toBeCloseTo(unitWeight, 6);
    expect(result.remainderKg).toBeCloseTo(0, 6);
  });

  it("returns fractional quantity and correct remainder", () => {
    const areaMm2 = 100 * 10; // flat bar 100x10
    const unitWeight = (areaMm2 * 6000 / 1_000_000_000) * STEEL_DENSITY;
    const targetWeight = unitWeight * 3.5;

    const result = solveForQuantity({
      ...baseParams,
      areaMm2,
      targetWeightKg: targetWeight,
    });

    expectQtyOk(result);
    expect(result.exactQuantity).toBeCloseTo(3.5, 6);
    expect(result.wholeQuantity).toBe(3);
    expect(result.remainderKg).toBeCloseTo(unitWeight * 0.5, 4);
  });

  it("accounts for waste percentage", () => {
    const areaMm2 = 50 * 50; // square bar 50mm
    const unitWeight = (areaMm2 * 6000 / 1_000_000_000) * STEEL_DENSITY;
    const wastePercent = 10;
    const totalPerPiece = unitWeight * (1 + wastePercent / 100);
    const targetWeight = totalPerPiece * 4; // exactly 4 pieces with waste

    const result = solveForQuantity({
      ...baseParams,
      areaMm2,
      targetWeightKg: targetWeight,
      wastePercent,
    });

    expectQtyOk(result);
    expect(result.exactQuantity).toBeCloseTo(4, 6);
    expect(result.wholeQuantity).toBe(4);
  });

  describe("input validation", () => {
    const validParams = {
      areaMm2: 1000,
      targetWeightKg: 100,
      densityKgPerM3: STEEL_DENSITY,
      lengthMm: 6000,
      wastePercent: 0,
    };

    it("rejects zero area", () => {
      const result = solveForQuantity({ ...validParams, areaMm2: 0 });
      expectQtyErr(result);
      expect(result.message).toMatch(/area/i);
    });

    it("rejects negative area", () => {
      const result = solveForQuantity({ ...validParams, areaMm2: -10 });
      expectQtyErr(result);
    });

    it("rejects zero density", () => {
      const result = solveForQuantity({ ...validParams, densityKgPerM3: 0 });
      expectQtyErr(result);
      expect(result.message).toMatch(/density/i);
    });

    it("rejects zero length", () => {
      const result = solveForQuantity({ ...validParams, lengthMm: 0 });
      expectQtyErr(result);
      expect(result.message).toMatch(/length/i);
    });

    it("rejects zero target weight", () => {
      const result = solveForQuantity({ ...validParams, targetWeightKg: 0 });
      expectQtyErr(result);
      expect(result.message).toMatch(/weight/i);
    });

    it("rejects NaN area", () => {
      const result = solveForQuantity({ ...validParams, areaMm2: NaN });
      expectQtyErr(result);
    });

    it("rejects Infinity area", () => {
      const result = solveForQuantity({ ...validParams, areaMm2: Infinity });
      expectQtyErr(result);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Round-trip consistency: forward engine -> reverse solver            */
/* ------------------------------------------------------------------ */

describe("round-trip consistency", () => {
  /**
   * Calculate forward weight via calculateMetal, then use solveForDimension
   * to recover each solvable dimension and verify it matches the original.
   */
  const TOLERANCE = 1e-4; // relative tolerance

  interface RoundTripCase {
    profileId: ProfileId;
    dimensions: Record<string, number>;
  }

  const cases: RoundTripCase[] = [
    { profileId: "round_bar", dimensions: { diameter: 40 } },
    { profileId: "square_bar", dimensions: { side: 35 } },
    { profileId: "flat_bar", dimensions: { width: 120, thickness: 10 } },
    { profileId: "sheet", dimensions: { width: 1250, thickness: 2.5 } },
    { profileId: "plate", dimensions: { width: 1500, thickness: 16 } },
    { profileId: "pipe", dimensions: { outerDiameter: 88.9, wallThickness: 5 } },
    { profileId: "rectangular_tube", dimensions: { width: 120, height: 80, wallThickness: 4 } },
    { profileId: "square_hollow", dimensions: { side: 100, wallThickness: 5 } },
    { profileId: "angle", dimensions: { legA: 80, legB: 80, thickness: 8 } },
    { profileId: "chequered_plate", dimensions: { width: 1500, thickness: 5, patternHeight: 2 } },
  ];

  const lengthMm = 6000;
  const quantity = 3;
  const wastePercent = 5;

  for (const tc of cases) {
    const solvableDims = getSolvableDimensions(tc.profileId);

    for (const solveDim of solvableDims) {
      it(`${tc.profileId}: recover ${solveDim}`, () => {
        // Build manual dimensions for forward calculation
        const manualDimensions: CalculationInput["manualDimensions"] = {};
        for (const [key, val] of Object.entries(tc.dimensions)) {
          manualDimensions[key as DimensionKey] = { value: val, unit: "mm" };
        }

        // Forward calculation
        const fwd = calculateMetal({
          materialGradeId: "steel-s235jr",
          useCustomDensity: false,
          profileId: tc.profileId,
          manualDimensions,
          length: { value: lengthMm, unit: "mm" },
          quantity,
          priceBasis: "weight",
          priceUnit: "kg",
          unitPrice: 1,
          currency: "EUR",
          wastePercent,
          includeVat: false,
          vatPercent: 0,
          rounding: ROUNDING,
        });

        expect(fwd.ok).toBe(true);
        if (!fwd.ok) return;

        const targetWeight = fwd.result.totalWeightKg;

        // Build known dimensions (all except the one being solved)
        const knownDimensions: Partial<Record<DimensionKey, number>> = {};
        for (const [key, val] of Object.entries(tc.dimensions)) {
          if (key !== solveDim) {
            knownDimensions[key as DimensionKey] = val;
          }
        }

        // Reverse solve
        const rev = solveForDimension({
          profileId: tc.profileId,
          targetWeightKg: targetWeight,
          densityKgPerM3: fwd.result.densityKgPerM3,
          lengthMm,
          quantity,
          wastePercent,
          solveDimension: solveDim,
          knownDimensions,
        });

        expectOk(rev);

        const expected = tc.dimensions[solveDim]!;
        const relError = Math.abs(rev.valueMm - expected) / expected;
        expect(relError).toBeLessThan(TOLERANCE);
      });
    }
  }
});

/* ------------------------------------------------------------------ */
/*  getSolvableDimensions                                              */
/* ------------------------------------------------------------------ */

describe("getSolvableDimensions", () => {
  it("returns correct dimensions for each manual profile", () => {
    expect(getSolvableDimensions("round_bar")).toEqual(["diameter"]);
    expect(getSolvableDimensions("square_bar")).toEqual(["side"]);
    expect(getSolvableDimensions("flat_bar")).toEqual(["width", "thickness"]);
    expect(getSolvableDimensions("sheet")).toEqual(["width", "thickness"]);
    expect(getSolvableDimensions("plate")).toEqual(["width", "thickness"]);
    expect(getSolvableDimensions("expanded_metal")).toEqual(["width", "thickness"]);
    expect(getSolvableDimensions("corrugated_sheet")).toEqual(["width", "thickness"]);
    expect(getSolvableDimensions("chequered_plate")).toEqual(["width", "thickness", "patternHeight"]);
    expect(getSolvableDimensions("pipe")).toEqual(["outerDiameter", "wallThickness"]);
    expect(getSolvableDimensions("rectangular_tube")).toEqual(["width", "height", "wallThickness"]);
    expect(getSolvableDimensions("square_hollow")).toEqual(["side", "wallThickness"]);
    expect(getSolvableDimensions("angle")).toEqual(["legA", "legB", "thickness"]);
  });

  it("returns empty array for standard EN profiles", () => {
    expect(getSolvableDimensions("beam_ipe_en")).toEqual([]);
    expect(getSolvableDimensions("channel_upn_en")).toEqual([]);
  });
});
