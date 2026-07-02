import { describe, it, expect } from "vitest";
import { cmdApplyInsert, cmdSuggest, presetToSizeText } from "./suggest";
import { findAliasByKey } from "./aliases";
import type { CommandParserSettings } from "./types";
import type { DimensionPreset } from "@/hooks/usePresets";

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

function mkPreset(overrides: Partial<DimensionPreset>): DimensionPreset {
  return {
    id: "p1",
    profileId: "square_hollow",
    label: "Shop standard",
    manualDimensionsMm: {},
    createdAt: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("presetToSizeText", () => {
  it("strips the alias prefix from standard size ids", () => {
    const hea = findAliasByKey("hea")!;
    expect(presetToSizeText(hea, mkPreset({ profileId: "beam_hea_en", selectedSizeId: "hea120" }))).toBe("120");
  });

  it("rejects standard presets whose size id belongs to another alias", () => {
    const hea = findAliasByKey("hea")!;
    expect(presetToSizeText(hea, mkPreset({ selectedSizeId: "heb140" }))).toBeNull();
  });

  it("converts manual dimensions per family", () => {
    expect(
      presetToSizeText(findAliasByKey("shs")!, mkPreset({ manualDimensionsMm: { side: 40, wallThickness: 3 } })),
    ).toBe("40x40x3");
    expect(
      presetToSizeText(findAliasByKey("rhs")!, mkPreset({ manualDimensionsMm: { width: 60, height: 40, wallThickness: 3 } })),
    ).toBe("60x40x3");
    expect(
      presetToSizeText(findAliasByKey("chs")!, mkPreset({ manualDimensionsMm: { outerDiameter: 60.3, wallThickness: 3.2 } })),
    ).toBe("60.3x3.2");
    expect(
      presetToSizeText(findAliasByKey("rnd")!, mkPreset({ manualDimensionsMm: { diameter: 20 } })),
    ).toBe("20");
    expect(
      presetToSizeText(findAliasByKey("flt")!, mkPreset({ manualDimensionsMm: { width: 40, thickness: 8 } })),
    ).toBe("40x8");
    expect(
      presetToSizeText(findAliasByKey("l")!, mkPreset({ manualDimensionsMm: { legA: 50, legB: 50, thickness: 5 } })),
    ).toBe("50x50x5");
  });

  it("returns null when required dimensions are missing", () => {
    expect(
      presetToSizeText(findAliasByKey("shs")!, mkPreset({ manualDimensionsMm: { side: 40 } })),
    ).toBeNull();
  });
});

describe("cmdSuggest with presets", () => {
  it("prepends presets in the size stage and dedupes against standard sizes", () => {
    const presets = [
      mkPreset({ id: "a", label: "Custom", manualDimensionsMm: { side: 45, wallThickness: 4 } }),
      mkPreset({ id: "b", label: "Dup of standard", manualDimensionsMm: { side: 40, wallThickness: 3 } }), // 40x40x3 is in COMMAND_SIZES.shs
    ];
    const sug = cmdSuggest("shs", SETTINGS, () => presets);
    expect(sug.items[0].label).toBe("45×45×4");
    expect(sug.items[0].sub).toBe("Custom");
    // the duplicate of a standard size appears only once
    const all = sug.items.map((i) => i.ins);
    expect(all.filter((x) => x === "40x40x3")).toHaveLength(1);
  });

  it("works without a presets lookup", () => {
    const sug = cmdSuggest("shs", SETTINGS);
    expect(sug.items.length).toBeGreaterThan(0);
    expect(sug.items[0].kind).toBe("size");
  });

  it("grade chips use the primary alias as insert text", () => {
    const sug = cmdSuggest("hea120 6m x2 ", SETTINGS);
    expect(sug.hint).toBe("Grade (optional)");
    const s420 = sug.items.find((i) => i.label === "S420");
    expect(s420?.ins).toBe("s420");
  });
});

describe("cmdApplyInsert", () => {
  it("size inserts glue onto the profile and end with a space", () => {
    expect(
      cmdApplyInsert("hea", { label: "120", ins: "120", kind: "size", appendProfile: true }),
    ).toBe("hea120 ");
  });

  it("length/qty/grade inserts end with a space so the next stage starts clean", () => {
    expect(
      cmdApplyInsert("hea120 ", { label: "6m", ins: "6m", kind: "length", space: true }),
    ).toBe("hea120 6m ");
    expect(
      cmdApplyInsert("hea120 6m", { label: "× 2", ins: "x2", kind: "qty", space: true }),
    ).toBe("hea120 6m x2 ");
  });

  it("profile inserts replace the trailing partial without a trailing space", () => {
    expect(
      cmdApplyInsert("he", { label: "HEA", ins: "hea", kind: "profile", replaceLast: true }),
    ).toBe("hea");
  });

  it("size suggestions follow immediately after a size insert", () => {
    const afterSize = cmdApplyInsert("hea", {
      label: "120",
      ins: "120",
      kind: "size",
      appendProfile: true,
    });
    expect(cmdSuggest(afterSize, SETTINGS).hint).toBe("Length");
  });
});
