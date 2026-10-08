import { describe, expect, it } from "vitest";
import { cmdParse, type CommandParserSettings } from "@ferroscale/metal-core";
import { barListLineToQuery, barListQueries } from "./import-list";

const SETTINGS = {
  pricing: {
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 2.5,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "mm",
} as unknown as CommandParserSettings;

describe("barListLineToQuery", () => {
  it("reads profile, length in mm and quantity from a comma line", () => {
    expect(barListLineToQuery("SHS 40x40x3, 2400, 12")).toBe("SHS 40x40x3 2400mm x12");
  });

  it("reads tab- and semicolon-separated cells the same way", () => {
    expect(barListLineToQuery("IPE 200\t6000\t2")).toBe("IPE 200 6000mm x2");
    expect(barListLineToQuery("flat 100x8; 600; 4")).toBe("flat 100x8 600mm x4");
  });

  it("keeps a length that already has a unit, and a decimal comma length", () => {
    expect(barListLineToQuery("hea120, 6m, 2")).toBe("hea120 6m x2");
    expect(barListLineToQuery("rhs 60x40x3; 1200,5; 2")).toBe("rhs 60x40x3 1200.5mm x2");
  });

  it("passes a command-line query through untouched", () => {
    expect(barListLineToQuery("  hea120 6m x2 ")).toBe("hea120 6m x2");
  });
});

describe("barListQueries", () => {
  it("drops blank lines and each line parses into a calculation", () => {
    const queries = barListQueries("SHS 40x40x3, 2400, 12\n\n  \nflat 100x8, 600, 4\r\nhea120 6m x2");
    expect(queries).toHaveLength(3);
    const parsed = queries.map((q) => cmdParse(q, SETTINGS));
    expect(parsed.map((p) => p.valid)).toEqual([true, true, true]);
    expect(parsed.map((p) => p.calc?.result.quantity)).toEqual([12, 4, 2]);
  });
});
