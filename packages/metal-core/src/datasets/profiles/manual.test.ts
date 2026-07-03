import { describe, it, expect } from "vitest";
import { MANUAL_PROFILES } from "./manual";
import { resolveAreaMm2, resolvePerimeterMm } from "../../calculator/engine";
import type { CalculationInput, UnitValue } from "../../calculator/types";
import type { DimensionKey, ManualDimsMm, ManualProfileDefinition } from "../types";

const CASE_DIMS: Record<string, ManualDimsMm> = {
  round_bar: { diameter: 40 },
  square_bar: { side: 35 },
  flat_bar: { width: 120, thickness: 10 },
  sheet: { width: 1250, thickness: 2.5 },
  plate: { width: 1500, thickness: 16 },
  pipe: { outerDiameter: 88.9, wallThickness: 5 },
  rectangular_tube: { width: 120, height: 80, wallThickness: 4 },
  square_hollow: { side: 100, wallThickness: 5 },
  chequered_plate: { width: 1500, thickness: 5, patternHeight: 2 },
  expanded_metal: { width: 1250, thickness: 3 },
  corrugated_sheet: { width: 1000, thickness: 0.7 },
  angle: { legA: 80, legB: 80, thickness: 8 },
};

function byId(id: string): ManualProfileDefinition {
  const profile = MANUAL_PROFILES.find((p) => p.id === id);
  if (!profile) throw new Error(`missing profile ${id}`);
  return profile;
}

function toInput(profile: ManualProfileDefinition, dims: ManualDimsMm): CalculationInput {
  const manualDimensions: Partial<Record<DimensionKey, UnitValue>> = {};
  for (const key of Object.keys(dims) as DimensionKey[]) {
    manualDimensions[key] = { value: dims[key]!, unit: "mm" };
  }
  return {
    materialGradeId: "steel-s235jr",
    useCustomDensity: false,
    profileId: profile.id,
    manualDimensions,
    length: { value: 6000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: { weightDecimals: 8, priceDecimals: 2, dimensionDecimals: 4 },
  };
}

describe("manual profile area/perimeter definitions", () => {
  it("every manual profile matches the engine's area and perimeter exactly", () => {
    for (const profile of MANUAL_PROFILES) {
      const dims = CASE_DIMS[profile.id];
      expect(dims, `no case dims for ${profile.id}`).toBeDefined();
      const input = toInput(profile, dims);

      const area = profile.area(dims);
      const engineArea = resolveAreaMm2(input);
      expect(area.areaMm2, profile.id).toBe(engineArea.areaMm2);
      expect(area.expression, profile.id).toBe(engineArea.expression);

      const perimeter = profile.perimeter(dims);
      const enginePerimeter = resolvePerimeterMm(input);
      expect(perimeter.perimeterMm, profile.id).toBe(enginePerimeter.perimeterMm);
      expect(perimeter.expression, profile.id).toBe(enginePerimeter.expression);
    }
  });

  it("pins the expression templates (unicode glyphs included)", () => {
    expect(byId("round_bar").area({ diameter: 40 }).expression).toBe("A = pi * 40.000^2 / 4");
    expect(byId("round_bar").perimeter({ diameter: 40 }).expression).toBe("P = π × 40.000");
    expect(byId("pipe").area({ outerDiameter: 88.9, wallThickness: 5 }).expression).toBe(
      "A = pi * (88.900^2 - 78.900^2) / 4",
    );
    expect(byId("square_hollow").area({ side: 100, wallThickness: 5 }).expression).toBe(
      "A = 100.000² − (100.000−2×5.000)²",
    );
    expect(byId("rectangular_tube").area({ width: 120, height: 80, wallThickness: 4 }).expression).toBe(
      "A = 120.000×80.000 − (120.000−2×4.000)×(80.000−2×4.000)",
    );
    expect(byId("angle").area({ legA: 80, legB: 80, thickness: 8 }).expression).toBe(
      "A = (80.000 + 80.000 − 8.000) × 8.000",
    );
    expect(byId("sheet").perimeter({ width: 1250 }).expression).toBe(
      "P = 2 × 1250.000 (two faces)",
    );
  });

  it("coerces missing dims to 0 (validation runs upstream)", () => {
    expect(byId("round_bar").area({})).toEqual({
      areaMm2: 0,
      expression: "A = pi * 0.000^2 / 4",
    });
    expect(byId("flat_bar").perimeter({})).toEqual({
      perimeterMm: 0,
      expression: "P = 2 × (0.000 + 0.000)",
    });
  });
});

describe("manual profile validateGeometry", () => {
  it("pipe: wall must stay below half the outer diameter", () => {
    const pipe = byId("pipe");
    expect(pipe.validateGeometry!({ outerDiameter: 60.3, wallThickness: 3.2 })).toEqual([]);
    // boundary: wall * 2 === OD fires
    const boundary = pipe.validateGeometry!({ outerDiameter: 20, wallThickness: 10 });
    expect(boundary).toHaveLength(1);
    expect(boundary[0]).toMatchObject({
      field: "manualDimensions.wallThickness",
      messageKey: "validation.pipeWall",
      messageValues: { wallMm: 10, halfOdMm: 10 },
    });
    // incomplete dims stay silent
    expect(pipe.validateGeometry!({ outerDiameter: 20 })).toEqual([]);
  });

  it("rectangular tube: wall must stay below half the smaller side", () => {
    const tube = byId("rectangular_tube");
    expect(tube.validateGeometry!({ width: 120, height: 80, wallThickness: 4 })).toEqual([]);
    const invalid = tube.validateGeometry!({ width: 120, height: 80, wallThickness: 40 });
    expect(invalid[0]).toMatchObject({
      messageKey: "validation.rectangularWall",
      messageValues: { wallMm: 40, maxWallMm: 40 },
    });
    expect(tube.validateGeometry!({ width: 120, wallThickness: 40 })).toEqual([]);
  });

  it("square hollow: wall must stay below half the side", () => {
    const shs = byId("square_hollow");
    expect(shs.validateGeometry!({ side: 100, wallThickness: 5 })).toEqual([]);
    const invalid = shs.validateGeometry!({ side: 100, wallThickness: 50 });
    expect(invalid[0]).toMatchObject({
      messageKey: "validation.squareWall",
      messageValues: { wallMm: 50, halfSideMm: 50 },
    });
    expect(shs.validateGeometry!({ wallThickness: 50 })).toEqual([]);
  });

  it("angle: thickness must stay below the shorter leg", () => {
    const angle = byId("angle");
    expect(angle.validateGeometry!({ legA: 80, legB: 60, thickness: 8 })).toEqual([]);
    const invalid = angle.validateGeometry!({ legA: 80, legB: 60, thickness: 60 });
    expect(invalid[0]).toMatchObject({
      field: "manualDimensions.thickness",
      messageKey: "validation.angleThickness",
      messageValues: { thicknessMm: 60, shorterLegMm: 60 },
    });
    expect(angle.validateGeometry!({ legA: 80, thickness: 60 })).toEqual([]);
  });

  it("only the four relational profiles declare validateGeometry", () => {
    const withChecks = MANUAL_PROFILES.filter((p) => p.validateGeometry).map((p) => p.id).sort();
    expect(withChecks).toEqual(["angle", "pipe", "rectangular_tube", "square_hollow"]);
  });
});
