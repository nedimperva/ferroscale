import { describe, it, expect } from "vitest";
import { cmdParse } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { buildBreakdownRows } from "./breakdown-rows";

const settings: CommandParserSettings = {
  pricing: {
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

const fakeT = (key: string) => key;

describe("buildBreakdownRows", () => {
  it("outputs massPerMetre for linear profiles", () => {
    const p = cmdParse("hea120 6m x2 s235", settings);
    const rows = buildBreakdownRows(p, fakeT);
    expect(rows).not.toBeNull();
    const massRow = rows!.geometry.find((r) => r.id === "massPerMetre");
    expect(massRow).toBeDefined();
    expect(massRow?.value).toContain("kg/m");
    expect(rows!.geometry.find((r) => r.id === "massPerArea")).toBeUndefined();
  });

  it("outputs massPerArea (kg/m²) for sheet and plate families", () => {
    // 1000mm x 2000mm x 10mm steel plate (density 7850 kg/m³)
    // 10mm steel plate is 78.50 kg/m²
    const p = cmdParse("plt1000x2000x10 s235", settings);
    const rows = buildBreakdownRows(p, fakeT);
    expect(rows).not.toBeNull();
    const massRow = rows!.geometry.find((r) => r.id === "massPerArea");
    expect(massRow).toBeDefined();
    expect(massRow?.value).toBe("78.50 kg/m²");
    expect(rows!.geometry.find((r) => r.id === "massPerMetre")).toBeUndefined();
  });
});
