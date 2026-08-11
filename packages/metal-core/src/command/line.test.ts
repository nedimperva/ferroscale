import { describe, it, expect } from "vitest";
import {
  cmdAppendLineItem,
  cmdParsePastedList,
  cmdPasteIntoLine,
  cmdParseLine,
  cmdReplaceLineItem,
  cmdSplitLine,
} from "./line";
import { cmdParse } from "./parser";
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

describe("cmdParseLine", () => {
  it("treats a single-item line exactly as the plain parser does", () => {
    const line = cmdParseLine("hea120 6m x2", mkSettings());
    const plain = cmdParse("hea120 6m x2", mkSettings());
    expect(line.multi).toBe(false);
    expect(line.items).toHaveLength(1);
    expect(line.totalKg).toBe(plain.totalKg);
    expect(line.totalAmount).toBe(plain.totalAmount);
    expect(line.valid).toBe(plain.valid);
  });

  it("parses two items and sums them", () => {
    const line = cmdParseLine("hea120 6m x2 + ipe200 4m x3", mkSettings());
    const first = cmdParse("hea120 6m x2", mkSettings());
    const second = cmdParse("ipe200 4m x3", mkSettings());

    expect(line.multi).toBe(true);
    expect(line.items).toHaveLength(2);
    expect(line.valid).toBe(true);
    expect(line.totalKg).toBeCloseTo(first.totalKg! + second.totalKg!, 6);
    expect(line.totalAmount).toBeCloseTo(first.totalAmount! + second.totalAmount!, 6);
  });

  it("commits every item but the one being typed", () => {
    // No trailing space: the last token is still under the caret and must not
    // be flagged, while "zzz" in a finished item must be.
    const line = cmdParseLine("hea120 6m zzz + ipe200 4", mkSettings());
    expect(line.items[0].parse.issues.some((issue) => issue.token === "zzz")).toBe(true);
    expect(line.items[1].parse.issues).toEqual([]);
  });

  it("splits without a space around the separator", () => {
    const line = cmdParseLine("hea120 6m+ipe200 4m", mkSettings());
    expect(line.items).toHaveLength(2);
    expect(line.items[1].parse.alias?.alias).toBe("ipe");
  });

  it("points at the item being typed", () => {
    const line = cmdParseLine("hea120 6m + ipe", mkSettings());
    expect(line.activeIndex).toBe(1);
    expect(line.items[line.activeIndex].parse.hasSize).toBe(false);
  });

  it("withholds a total until every item is valid", () => {
    const line = cmdParseLine("hea120 6m + ipe200", mkSettings());
    expect(line.valid).toBe(false);
    expect(line.totalKg).toBeNull();
    expect(line.totalAmount).toBeNull();
    // The finished item still carries its own numbers.
    expect(line.items[0].parse.totalKg).toBeGreaterThan(0);
  });

  it("keeps each item's own rate and grade", () => {
    const line = cmdParseLine("rnd20 6m 304 @5/kg + rnd20 6m s235", mkSettings());
    expect(line.items[0].parse.calc!.input.unitPrice).toBe(5);
    expect(line.items[1].parse.calc!.input.unitPrice).toBe(1.2);
  });

  it("solves a target inside one item without touching the other", () => {
    const line = cmdParseLine("hea120 6m =500kg + ipe200 4m x3", mkSettings());
    expect(line.items[0].parse.target?.solvedFor).toBe("qty");
    expect(line.items[1].parse.target).toBeNull();
    expect(line.items[1].parse.realQty).toBe(3);
  });

  it("collects every item's issues in order", () => {
    const line = cmdParseLine("hea120 zzz 6m + ipe200 qqq 4m ", mkSettings());
    expect(line.issues.map((issue) => issue.token)).toEqual(["zzz", "qqq"]);
  });

  it("tolerates an empty trailing item while it is being started", () => {
    const line = cmdParseLine("hea120 6m + ", mkSettings());
    expect(line.items).toHaveLength(2);
    expect(line.valid).toBe(false);
    expect(line.items[1].parse.alias).toBeNull();
  });
});

describe("editing a line", () => {
  it("splits into segments with their offsets", () => {
    const segments = cmdSplitLine("a + b");
    expect(segments.map((segment) => segment.text)).toEqual(["a ", " b"]);
    expect("a + b".slice(segments[1].start, segments[1].end)).toBe(" b");
  });

  it("replaces one item and leaves the others byte-for-byte", () => {
    const next = cmdReplaceLineItem("hea120 6m + ipe200 4m", 1, " rnd20 3m");
    expect(next).toBe("hea120 6m + rnd20 3m");
  });

  it("ignores a replacement aimed at an item that isn't there", () => {
    expect(cmdReplaceLineItem("hea120 6m", 4, "x")).toBe("hea120 6m");
  });

  it("appends a separator ready to type into", () => {
    expect(cmdAppendLineItem("hea120 6m x2 ")).toBe("hea120 6m x2 + ");
  });

  it("won't start a second item on an empty line", () => {
    expect(cmdAppendLineItem("   ")).toBe("");
  });
});

describe("cmdParsePastedList", () => {
  it("turns one row per part into one item per part", () => {
    const pasted = "hea120 6m x2\nipe200 4m x3";
    expect(cmdParsePastedList(pasted)).toBe("hea120 6m x2 + ipe200 4m x3 ");
  });

  it("collapses spreadsheet column separators to spaces", () => {
    expect(cmdParsePastedList("hea120\t6m\tx2\nipe200;4m;x3")).toBe(
      "hea120 6m x2 + ipe200 4m x3 ",
    );
  });

  it("drops blank rows", () => {
    expect(cmdParsePastedList("hea120 6m\n\n  \nipe200 4m\n")).toBe("hea120 6m + ipe200 4m ");
  });

  it("leaves an ordinary one-line paste alone", () => {
    expect(cmdParsePastedList("hea120 6m x2")).toBeNull();
    expect(cmdParsePastedList("")).toBeNull();
    expect(cmdParsePastedList("hea120 6m\n")).toBeNull();
  });

  it("caps a mis-paste rather than building an unreadable line", () => {
    const rows = Array.from({ length: 50 }, (_, i) => `hea120 ${i + 1}m`).join("\n");
    const line = cmdParsePastedList(rows)!;
    expect(line.split(" + ")).toHaveLength(20);
  });

  it("produces a line the parser reads back as the rows that went in", () => {
    const line = cmdParsePastedList("hea120 6m x2\nipe200 4m x3")!;
    const parsed = cmdParseLine(line, mkSettings());
    expect(parsed.items).toHaveLength(2);
    expect(parsed.valid).toBe(true);
  });
});

describe("cmdPasteIntoLine", () => {
  it("adds the pasted rows to what's already there", () => {
    expect(cmdPasteIntoLine("hea120 6m x2 ", "ipe200 4m\nrnd20 3m")).toBe(
      "hea120 6m x2 + ipe200 4m + rnd20 3m ",
    );
  });

  it("is the whole line when there was nothing on it", () => {
    expect(cmdPasteIntoLine("", "ipe200 4m\nrnd20 3m")).toBe("ipe200 4m + rnd20 3m ");
    expect(cmdPasteIntoLine("   ", "ipe200 4m\nrnd20 3m")).toBe("ipe200 4m + rnd20 3m ");
  });

  it("leaves an ordinary paste to the browser", () => {
    expect(cmdPasteIntoLine("hea120 ", "6m")).toBeNull();
  });

  it("never discards a line the user had already typed", () => {
    const typed = "hea120 6m x2 s355 ";
    const next = cmdPasteIntoLine(typed, "ipe200 4m\nrnd20 3m")!;
    expect(next.startsWith(typed.trim())).toBe(true);
  });

  it("produces a line the parser reads as every item together", () => {
    const next = cmdPasteIntoLine("hea120 6m ", "ipe200 4m\nrnd20 3m")!;
    const parsed = cmdParseLine(next, mkSettings());
    expect(parsed.items).toHaveLength(3);
    expect(parsed.valid).toBe(true);
  });
});
