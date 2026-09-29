import { describe, expect, it } from "vitest";
import { cmdParse, cmdTokenize } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { EXAMPLE_LINE, EXAMPLE_QUERY, PLACEHOLDER_EXAMPLES, isSampleQuery, DEMO_QUERY } from "./command-constants";

const ALL_EXAMPLES = Object.entries(PLACEHOLDER_EXAMPLES).flatMap(([locale, lines]) =>
  lines.map((line) => [locale, line] as const),
);

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
  defaultLengthUnit: "mm",
};

// The empty screen teaches with these lines. A hint that fails when typed is
// worse than no hint, so each must parse clean — whatever the user's unit.
describe("onboarding examples", () => {
  it.each(ALL_EXAMPLES)("%s placeholder %s parses clean", (_, line) => {
    for (const unit of ["mm", "m"] as const) {
      const p = cmdParse(`${line} `, { ...SETTINGS, defaultLengthUnit: unit });
      expect(p.valid).toBe(true);
      expect(p.issues).toEqual([]);
    }
  });

  it("labels every word of the example line, one token each", () => {
    expect(cmdTokenize(EXAMPLE_QUERY)).toEqual(EXAMPLE_LINE.map((part) => part.token));
    const p = cmdParse(EXAMPLE_QUERY, SETTINGS);
    expect(p.valid).toBe(true);
    expect(p.issues).toEqual([]);
    expect(p.realQty).toBe(2);
    expect(p.gradeId).toBe("steel-s355jr");
  });

  it("treats both loaded samples as not the user's own work", () => {
    expect(isSampleQuery(EXAMPLE_QUERY)).toBe(true);
    expect(isSampleQuery(DEMO_QUERY)).toBe(true);
    expect(isSampleQuery("hea120 6m ")).toBe(false);
  });
});
