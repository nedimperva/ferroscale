import { describe, expect, it } from "vitest";
import { cmdParse } from "@ferroscale/metal-core";
import { commandStageProgress, findSteppableLength, nudgeItemLength, nudgeItemQty } from "./command-nudge";

const SETTINGS = {
  pricing: {
    priceBasis: "weight" as const,
    priceUnit: "kg" as const,
    unitPrice: 2.5,
    currency: "EUR" as const,
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m" as const,
};

describe("commandStageProgress", () => {
  it("reports 0 on empty, 1 on profile, 2 on size, 4 on valid", () => {
    expect(commandStageProgress(cmdParse("", SETTINGS))).toBe(0);
    expect(commandStageProgress(cmdParse("hea", SETTINGS))).toBe(1);
    expect(commandStageProgress(cmdParse("hea120", SETTINGS))).toBe(2);
    expect(commandStageProgress(cmdParse("hea120 6m", SETTINGS))).toBe(4);
  });
});

describe("nudgeItemLength", () => {
  it("steps a standard length token up and down in place", () => {
    expect(nudgeItemLength("hea120 6m x2 ", 0, 1)).toBe("hea120 7m x2 ");
    expect(nudgeItemLength("hea120 6m x2 ", 0, -1)).toBe("hea120 5m x2 ");
  });

  it("ignores arithmetic length expressions", () => {
    expect(findSteppableLength("hea120 6m-50mm x2 ", 0)).toBeNull();
    expect(nudgeItemLength("hea120 6m-50mm x2 ", 0, 1)).toBeNull();
  });

  it("scopes edits to the targeted item in a multi-item line", () => {
    expect(nudgeItemLength("hea120 6m + ipe200 4m ", 1, 1)).toBe("hea120 6m + ipe200 5m ");
  });
});

describe("nudgeItemQty", () => {
  it("steps an existing quantity token up and down", () => {
    expect(nudgeItemQty("hea120 6m x2 ", 0, 2, 1)).toBe("hea120 6m x3 ");
    expect(nudgeItemQty("hea120 6m x2 ", 0, 2, -1)).toBe("hea120 6m x1 ");
    expect(nudgeItemQty("hea120 6m x1 ", 0, 1, -1)).toBeNull();
  });

  it("appends x2 when incrementing an implicit single piece", () => {
    expect(nudgeItemQty("hea120 6m ", 0, 1, 1)).toBe("hea120 6m x2 ");
    expect(nudgeItemQty("hea120 6m ", 0, 1, -1)).toBeNull();
  });
});
