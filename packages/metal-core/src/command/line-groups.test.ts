import { describe, it, expect } from "vitest";
import { cmdParseLine } from "./line";
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

describe("cmdParseLine — one profile, several lengths", () => {
  it("lets a cut borrow the profile of the item before it", () => {
    const line = cmdParseLine("hea120 6m + 8m", mkSettings());
    expect(line.items).toHaveLength(2);
    expect(line.items[1].parse.alias?.alias).toBe("hea");
    expect(line.items[1].parse.lengthM).toBe(8);
    expect(line.items[1].inheritedProfile).toBe("hea120");
    expect(line.valid).toBe(true);
  });

  it("sums the whole run into the line total", () => {
    const line = cmdParseLine("hea120 6m + 8m + 10m", mkSettings());
    const plain = cmdParse("hea120 6m", mkSettings());
    expect(line.valid).toBe(true);
    // Three cuts of the same section: the run weighs the sum of its lengths.
    const expected = plain.kgm! * 6 + plain.kgm! * 8 + plain.kgm! * 10;
    expect(line.totalKg).toBeCloseTo(expected, 6);
  });

  it("groups the cuts under one profile", () => {
    const line = cmdParseLine("hea120 6m + 8m + 10m", mkSettings());
    expect(line.groups).toHaveLength(1);
    expect(line.groups[0].multi).toBe(true);
    expect(line.groups[0].items).toEqual([0, 1, 2]);
    expect(line.groups[0].profile).toBe("hea120");
  });

  it("keeps a different profile in its own group", () => {
    const line = cmdParseLine("hea120 6m + 8m + ipe200 4m", mkSettings());
    expect(line.groups).toHaveLength(2);
    expect(line.groups[0].items).toEqual([0, 1]);
    expect(line.groups[1].items).toEqual([2]);
    expect(line.groups[1].profile).toBe("ipe200");
  });

  it("does not let a cut borrow across a different profile", () => {
    const line = cmdParseLine("hea120 6m + ipe200 4m + 8m", mkSettings());
    // The third item follows an IPE, so the IPE is what it borrows.
    expect(line.items[2].inheritedProfile).toBe("ipe200");
    expect(line.items[2].parse.alias?.alias).toBe("ipe");
  });

  it("borrows an explicitly typed grade, and only one", () => {
    const typed = cmdParseLine("hea120 6m s235 + 8m", mkSettings());
    expect(typed.items[1].parse.gradeId).toBe("steel-s235jr");
    expect(typed.items[1].inheritedGrade).toBe("s235");

    const defaulted = cmdParseLine("hea120 6m + 8m", mkSettings());
    expect(defaulted.items[1].inheritedGrade).toBeNull();
  });

  it("leaves an item with neither profile nor length alone", () => {
    const line = cmdParseLine("hea120 6m + s235", mkSettings());
    expect(line.items[1].inheritedProfile).toBeNull();
    expect(line.items[1].parse.alias).toBeNull();
  });

  it("reports which item an issue came from", () => {
    const line = cmdParseLine("hea120 6m + hea999 ", mkSettings());
    const issue = line.issues.find((i) => i.code === "unknownSize");
    expect(issue?.itemIndex).toBe(1);
    // The issue points at the token that caused it, so the UI can mark the
    // chip instead of only writing a sentence under the answer.
    expect(issue?.tokenIndex).toBe(0);
  });
});
