import { describe, it, expect } from "vitest";
import { cmdSuggest } from "./suggest";
import type { CommandParserSettings } from "./types";
import type { CommandUsageSource } from "./suggest";

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

function mkUsage(overrides: Partial<CommandUsageSource> = {}): CommandUsageSource {
  return {
    recentQueries: () => [],
    topSizes: () => [],
    topLengths: () => [],
    topQuantities: () => [],
    topGradeIds: () => [],
    ...overrides,
  };
}

describe("size chips carry the weight they would come to", () => {
  it("shows a total weight when the line already fixes the length", () => {
    // The parser reads tokens in any order, so a line that leads with its
    // length knows the length while the size is still being chosen.
    const sug = cmdSuggest("6m hea ", SETTINGS, undefined, undefined);
    const hea120 = sug.items.find((item) => item.label === "120");
    expect(hea120).toBeDefined();
    expect(hea120?.weightKg).toBeGreaterThan(0);
  });

  it("leaves the weight empty when there is no length yet", () => {
    const sug = cmdSuggest("hea ", SETTINGS, undefined, undefined);
    for (const item of sug.items) {
      expect(item.weightKg).toBeUndefined();
    }
  });

  it("scales the weight with the quantity on the line", () => {
    const one = cmdSuggest("6m hea x1 ", SETTINGS, undefined, undefined);
    const four = cmdSuggest("6m hea x4 ", SETTINGS, undefined, undefined);
    const oneItem = one.items.find((item) => item.label === "120");
    const fourItem = four.items.find((item) => item.label === "120");
    expect(oneItem?.weightKg).toBeGreaterThan(0);
    expect(fourItem?.weightKg).toBeCloseTo((oneItem?.weightKg ?? 0) * 4, 6);
  });
});

describe("learned corrections", () => {
  it("offers what the user corrected this word into", () => {
    const usage = mkUsage({
      learnedCorrections: (from) =>
        from.toLowerCase() === "hae120" ? [{ to: "hea120", n: 6 }] : [],
    });
    const sug = cmdSuggest("hae120", SETTINGS, undefined, usage);
    const learned = sug.items.find((item) => item.learned);
    expect(learned?.label).toBe("hea120");
    expect(learned?.learnedCount).toBe(6);
    expect(learned?.group).toBe("learned");
  });

  it("keeps a correction out of the way of a word the catalogue knows", () => {
    const usage = mkUsage({
      learnedCorrections: () => [{ to: "heab200", n: 3 }],
    });
    const sug = cmdSuggest("hea120", SETTINGS, undefined, usage);
    expect(sug.items.some((item) => item.learned)).toBe(false);
  });

  it("offers a corrected size at the size stage", () => {
    const usage = mkUsage({
      learnedCorrections: (from) =>
        from.toLowerCase() === "40x40x" ? [{ to: "40x40x3", n: 2 }] : [],
    });
    const sug = cmdSuggest("shs 40x40x", SETTINGS, undefined, usage);
    const learned = sug.items.find((item) => item.learned);
    expect(learned?.label).toBe("40x40x3");
  });

  it("works with no learned corrections at all", () => {
    const sug = cmdSuggest("hae120", SETTINGS, undefined, mkUsage());
    expect(sug.items.some((item) => item.learned)).toBe(false);
    expect(sug.items.length).toBeGreaterThan(0);
  });
});
