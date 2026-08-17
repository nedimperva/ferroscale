import { describe, it, expect } from "vitest";
import { cmdParse, cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { buildCommandSummary } from "./command-copy";
import { buildShareCardModel } from "./line-summary";

const SETTINGS: CommandParserSettings = {
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

/** The app maps keys to localized strings; the key itself is enough here. */
const t = (key: string) => key;

describe("buildCommandSummary", () => {
  it("describes a single line", () => {
    const summary = buildCommandSummary(t, cmdParse("hea120 6m x2", SETTINGS))!;
    expect(summary).toContain("result.totalWeight");
    expect(summary).toContain("238.7 kg");
  });

  it("is null for a line that isn't a calculation yet", () => {
    expect(buildCommandSummary(t, cmdParse("hea120", SETTINGS))).toBeNull();
  });

  it("copies every item of a multi-item line, not just the last", () => {
    const line = cmdParseLine("hea120 6m x2 + ipe200 4m x3", SETTINGS);
    const summary = buildCommandSummary(t, line.items[line.activeIndex].parse, line)!;
    // Pasting one item of a two-item quote would send the wrong number.
    expect(summary).toContain("HEA 120");
    expect(summary).toContain("IPE 200");
    expect(summary).toContain("line.total");
  });

  it("totals the line, not the item under the caret", () => {
    const line = cmdParseLine("hea120 6m x2 + ipe200 4m x3", SETTINGS);
    const summary = buildCommandSummary(t, line.items[line.activeIndex].parse, line)!;
    expect(summary).toContain("506.98");
  });

  it("withholds a line total while an item is still incomplete", () => {
    const line = cmdParseLine("hea120 6m x2 + ipe200", SETTINGS);
    const summary = buildCommandSummary(t, line.items[line.activeIndex].parse, line)!;
    // The finished item is still worth copying; a partial sum called "the
    // total" would be worse than no total.
    expect(summary).toContain("HEA 120");
    expect(summary).not.toContain("line.total");
  });

  it("ignores the line argument when there is only one item", () => {
    const line = cmdParseLine("hea120 6m x2", SETTINGS);
    const single = buildCommandSummary(t, line.items[0].parse);
    expect(buildCommandSummary(t, line.items[0].parse, line)).toBe(single);
  });
});

describe("buildShareCardModel", () => {
  it("uses the part name for a single item", () => {
    const line = cmdParseLine("hea120 6m x2", SETTINGS);
    const card = buildShareCardModel(t, line.items[0].parse, line, "hea120 6m x2");
    expect(card.title).toContain("HEA 120");
    expect(card.items).toEqual([]);
    expect(card.weight).toContain("238.7");
  });

  it("lists every part of an assembly under the line total", () => {
    const query = "hea120 6m x2 + ipe200 4m x3";
    const line = cmdParseLine(query, SETTINGS);
    const card = buildShareCardModel(t, line.items[line.activeIndex].parse, line, query);
    expect(card.title).toBe("result.assembly");
    expect(card.items).toHaveLength(2);
    expect(card.items[0].label).toContain("HEA 120");
    expect(card.items[1].label).toContain("IPE 200");
    expect(card.weight).toContain("506.98");
  });
});
