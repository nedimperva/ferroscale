import { describe, it, expect } from "vitest";
import { cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { groupBillOfMaterial } from "./bom-groups";

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

const groups = (query: string) => groupBillOfMaterial(cmdParseLine(query, settings));

describe("groupBillOfMaterial", () => {
  it("groups one profile and size across different lengths", () => {
    const result = groups("l45x45x5 4500mm + hea120 6m + l45x45x5 740mm x2");
    expect(result.map((g) => g.members.map((m) => m.index))).toEqual([[0, 2], [1]]);
    const angle = result[0];
    expect(angle.kind).toBe("section");
    expect(angle.members.map((m) => m.cut)).toEqual(["4500 mm", "740 mm"]);
    expect(angle.pieces).toBe(3);
    expect(angle.totalLengthM).toBeCloseTo(4.5 + 0.74 * 2, 6);
    const line = cmdParseLine("l45x45x5 4500mm + hea120 6m + l45x45x5 740mm x2", settings);
    expect(angle.totalKg).toBeCloseTo(line.items[0].parse.totalKg! + line.items[2].parse.totalKg!, 6);
  });

  it("keeps different sizes and grades apart", () => {
    const result = groups("hea120 6m + hea140 6m + hea120 3m s355");
    expect(result).toHaveLength(3);
  });

  it("groups sheet goods by thickness, whatever their width and length", () => {
    const result = groups("plt1500x3000x10 x2 + plt200x300x10 + sht1000x2000x5 + plt200x300x10 x4");
    expect(result.map((g) => g.members.map((m) => m.index))).toEqual([[0, 1, 3], [2]]);
    expect(result[0].kind).toBe("sheet");
    expect(result[0].thicknessMm).toBe(10);
    expect(result[0].members.map((m) => m.cut)).toEqual(["1500 × 3000 mm", "200 × 300 mm", "200 × 300 mm"]);
    expect(result[0].pieces).toBe(7);
    expect(result[1].thicknessMm).toBe(5);
  });

  it("keeps an unfinished part as its own group", () => {
    const result = groups("hea120 6m + hea120");
    expect(result).toHaveLength(2);
    expect(result[1].kind).toBe("single");
  });
});
