import { describe, it, expect } from "vitest";
import { cmdParse, cmdClassifyToken, cmdTokenize } from "./parser";
import { cmdParseLine } from "./line";
import { parseLengthExpression, parseQtyExpression } from "./arith";
import type { CommandParserSettings, CommandPricing } from "./types";

const PRICING: CommandPricing = {
  priceBasis: "weight",
  priceUnit: "kg",
  unitPrice: 1.2,
  currency: "EUR",
  wastePercent: 0,
  includeVat: false,
  vatPercent: 0,
};

function mkSettings(overrides: Partial<CommandParserSettings> = {}): CommandParserSettings {
  return {
    pricing: { ...PRICING, ...(overrides.pricing ?? {}) },
    defaultGradeId: "steel-s235jr",
    defaultLengthUnit: "m",
    ...overrides,
  };
}

describe("parseLengthExpression", () => {
  it("subtracts across units", () => {
    expect(parseLengthExpression("6m-50mm", "m")?.mm).toBe(5950);
    expect(parseLengthExpression("6m-50mm-50mm", "m")?.mm).toBe(5900);
    expect(parseLengthExpression("6m+200mm", "m")?.mm).toBe(6200);
  });

  it("reports the answer in the first term's unit", () => {
    const expr = parseLengthExpression("6m-50mm", "mm");
    expect(expr?.unit).toBe("m");
    expect(expr?.explicit).toBe(true);
  });

  it("lets a bare first term take the default unit, and later terms inherit it", () => {
    // "6000-50" in millimetres means what it says; it must not silently mix.
    const expr = parseLengthExpression("6000-50", "mm");
    expect(expr?.mm).toBe(5950);
    expect(expr?.unit).toBe("mm");
    expect(expr?.explicit).toBe(false);
    // The same text with metres as the default is six kilometres less fifty.
    expect(parseLengthExpression("6000-50", "m")?.mm).toBe(5_950_000);
  });

  it("evaluates left to right", () => {
    expect(parseLengthExpression("6m-1m+500mm", "m")?.mm).toBe(5500);
  });

  it("refuses a cut that removes more than the stock", () => {
    expect(parseLengthExpression("50mm-6m", "m")).toBeNull();
    expect(parseLengthExpression("6m-6m", "m")).toBeNull();
  });

  it("is not fooled by a plain length or a size token", () => {
    expect(parseLengthExpression("6m", "m")).toBeNull();
    expect(parseLengthExpression("40x40x3", "m")).toBeNull();
  });
});

describe("parseQtyExpression", () => {
  it("adds and subtracts pieces", () => {
    expect(parseQtyExpression("x2+3")).toBe(5);
    expect(parseQtyExpression("x10-2")).toBe(8);
    expect(parseQtyExpression("x2+3+4")).toBe(9);
  });

  it("refuses a count that isn't at least one piece", () => {
    expect(parseQtyExpression("x2-2")).toBeNull();
    expect(parseQtyExpression("x2-5")).toBeNull();
  });

  it("leaves a plain quantity to the plain matcher", () => {
    expect(parseQtyExpression("x2")).toBeNull();
  });
});

describe("arithmetic in a query", () => {
  it("prices a bar cut to fit", () => {
    const cut = cmdParse("hea120 6m-50mm x2", mkSettings());
    const plain = cmdParse("hea120 5.95m x2", mkSettings());
    expect(cut.valid).toBe(true);
    expect(cut.lengthM).toBeCloseTo(5.95, 6);
    expect(cut.totalKg).toBeCloseTo(plain.totalKg!, 6);
  });

  it("adds pieces without retyping the total", () => {
    const p = cmdParse("hea120 6m x2+3", mkSettings());
    expect(p.realQty).toBe(5);
    expect(p.valid).toBe(true);
  });

  it("survives the tokenizer as one token", () => {
    expect(cmdTokenize("hea120 6m-50mm x2 ")).toEqual(["hea120", "6m-50mm", "x2"]);
  });

  it("classifies each kind so the chip is coloured as what it is", () => {
    expect(cmdClassifyToken("6m-50mm")).toBe("len");
    expect(cmdClassifyToken("x2+3")).toBe("qty");
  });

  it("reports an impossible cut rather than pricing something wrong", () => {
    const p = cmdParse("hea120 50mm-6m ", mkSettings());
    expect(p.valid).toBe(false);
    expect(p.issues.some((issue) => issue.token === "50mm-6m")).toBe(true);
  });
});

describe("arithmetic next to the item separator", () => {
  it("keeps a glued +digit as arithmetic, not a second item", () => {
    const line = cmdParseLine("hea120 6m x2+3", mkSettings());
    expect(line.multi).toBe(false);
    expect(line.items[0].parse.realQty).toBe(5);
  });

  it("still splits a glued + that starts a profile", () => {
    const line = cmdParseLine("hea120 6m+ipe200 4m", mkSettings());
    expect(line.multi).toBe(true);
  });

  it("treats a spaced + as the separator whatever follows it", () => {
    const line = cmdParseLine("hea120 6m + ipe200 4m", mkSettings());
    expect(line.multi).toBe(true);
  });

  it("handles arithmetic inside one item of a multi-item line", () => {
    const line = cmdParseLine("hea120 6m-50mm x2 + ipe200 4m x3", mkSettings());
    expect(line.items).toHaveLength(2);
    expect(line.items[0].parse.lengthM).toBeCloseTo(5.95, 6);
    expect(line.items[1].parse.realQty).toBe(3);
  });
});
