import { describe, it, expect } from "vitest";
import { cmdApplyInsert, cmdSuggest, presetToSizeText } from "./suggest";
import { findAliasByKey } from "./aliases";
import type { CommandParserSettings } from "./types";
import type { CommandSizePreset } from "./types";

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

function mkPreset(overrides: Partial<CommandSizePreset>): CommandSizePreset {
  return {
    label: "Shop standard",
    manualDimensionsMm: {},
    ...overrides,
  };
}

describe("presetToSizeText", () => {
  it("strips the alias prefix from standard size ids", () => {
    const hea = findAliasByKey("hea")!;
    expect(presetToSizeText(hea, mkPreset({ selectedSizeId: "hea120" }))).toBe("120");
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
      mkPreset({ label: "Custom", manualDimensionsMm: { side: 45, wallThickness: 4 } }),
      mkPreset({ label: "Dup of standard", manualDimensionsMm: { side: 40, wallThickness: 3 } }), // 40x40x3 is in COMMAND_SIZES.shs
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

  it("shows a per-metre weight under standard size chips", () => {
    const sug = cmdSuggest("hea", SETTINGS);
    const size = sug.items.find((i) => i.kind === "size");
    expect(size?.sub).toMatch(/kg\/m$/);
  });

  it("omits the per-metre weight for sheet-like families (priced per piece)", () => {
    const sug = cmdSuggest("plt", SETTINGS);
    const sizes = sug.items.filter((i) => i.kind === "size");
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.every((i) => i.sub === undefined)).toBe(true);
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

import type { CommandUsageSource } from "./suggest";

function usageStub(overrides: Partial<CommandUsageSource> = {}): CommandUsageSource {
  return {
    recentQueries: () => [],
    topSizes: () => [],
    topLengths: () => [],
    topQuantities: () => [],
    topGradeIds: () => [],
    ...overrides,
  };
}

describe("cmdSuggest usage ranking", () => {
  it("puts recently run queries before the curated profile chips", () => {
    const usage = usageStub({
      recentQueries: () => ["hea120 6m x2", "not a real query", "flt40x8 4m"],
    });
    const s = cmdSuggest("", SETTINGS, undefined, usage);
    expect(s.items[0]).toMatchObject({ kind: "recent", label: "hea120 6m x2" });
    expect(s.items[1]).toMatchObject({ kind: "recent", label: "flt40x8 4m" });
    expect(s.items[2].kind).toBe("profile");
  });

  it("filters recent queries by the typed partial", () => {
    const usage = usageStub({
      recentQueries: () => ["hea120 6m x2", "flt40x8 4m"],
    });
    const s = cmdSuggest("fl", SETTINGS, undefined, usage);
    const recents = s.items.filter((i) => i.kind === "recent");
    expect(recents).toHaveLength(1);
    expect(recents[0].label).toBe("flt40x8 4m");
  });

  it("surfaces the family's own top sizes first", () => {
    const usage = usageStub({
      topSizes: (fam) => (fam === "shs" ? ["45x45x4", "50x50x5"] : []),
    });
    const s = cmdSuggest("shs", SETTINGS, undefined, usage);
    expect(s.items[0]).toMatchObject({ kind: "size", label: "45×45×4" });
    expect(s.items[1]).toMatchObject({ kind: "size", label: "50×50×5" });
    // a different family gets none of them
    const hea = cmdSuggest("hea", SETTINGS, undefined, usage);
    expect(hea.items.every((i) => i.label !== "45×45×4")).toBe(true);
  });

  it("drops usage sizes that no longer resolve and duplicates of curated sizes", () => {
    const usage = usageStub({
      // hea has a real size table: 999 doesn't exist there
      topSizes: () => ["999", "120"],
    });
    const s = cmdSuggest("hea", SETTINGS, undefined, usage);
    expect(s.items.every((i) => i.label !== "999")).toBe(true);
    // "120" is already in COMMAND_SIZES.beam → appears exactly once
    expect(s.items.filter((i) => i.label === "120")).toHaveLength(1);
  });

  it("surfaces used lengths and quantities before the curated defaults", () => {
    const usage = usageStub({
      topLengths: (fam) => (fam === "beam" ? ["7.5m", "6m"] : []),
      topQuantities: (fam) => (fam === "beam" ? ["x7", "garbage"] : []),
    });
    const len = cmdSuggest("hea120 ", SETTINGS, undefined, usage);
    // "6m" is curated → not duplicated; "7.5m" leads
    expect(len.items[0]).toMatchObject({ kind: "length", label: "7.5m" });
    expect(len.items.filter((i) => i.label === "6m")).toHaveLength(1);

    const qty = cmdSuggest("hea120 6m ", SETTINGS, undefined, usage);
    expect(qty.items[0]).toMatchObject({ kind: "qty", label: "× 7" });
    expect(qty.items.every((i) => i.label !== "garbage")).toBe(true);
  });

  it("reorders grades by usage without losing the rest of the catalog", () => {
    const usage = usageStub({
      topGradeIds: (fam) => (fam === "beam" ? ["stainless-304"] : []),
    });
    const s = cmdSuggest("hea120 6m x2 ", SETTINGS, undefined, usage);
    expect(s.items[0]).toMatchObject({ kind: "grade", label: "304" });
    // catalog is intact (all grades present exactly once)
    const labels = s.items.filter((i) => i.kind === "grade").map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.length).toBeGreaterThan(5);
  });
});

describe("refine stage (a finished query)", () => {
  const DONE = "hea120 6m x2 s235 ";

  it("offers variations instead of a lone Save chip", () => {
    const s = cmdSuggest(DONE, SETTINGS);
    expect(s.hint).toBe("Refine");
    expect(s.items.length).toBeGreaterThan(1);
    // Save stays available, but last — the moment belongs to "what if".
    expect(s.items[s.items.length - 1]).toMatchObject({ kind: "save" });
    expect(s.items.filter((i) => i.kind === "refine").length).toBeGreaterThan(2);
  });

  it("suggests more pieces and other stock lengths, each with its total", () => {
    const s = cmdSuggest(DONE, SETTINGS);
    const qty = s.items.find((i) => i.replaceKind === "qty");
    expect(qty).toMatchObject({ label: "× 4", ins: "x4" });
    // 19.9 kg/m × 6 m × 4 ≈ 477 kg
    expect(qty?.sub).toMatch(/^4\d\d kg$/);

    const lengths = s.items.filter((i) => i.replaceKind === "len");
    expect(lengths.map((i) => i.ins)).not.toContain("6m");
    expect(lengths[0].sub).toMatch(/kg$/);
  });

  it("offers the neighbouring catalog sizes with their kg/m", () => {
    const s = cmdSuggest(DONE, SETTINGS);
    const sizes = s.items.filter((i) => i.replaceKind === "size");
    expect(sizes.map((i) => i.ins)).toEqual(["hea140", "hea100"]);
    expect(sizes[0].sub).toMatch(/kg\/m$/);
  });

  it("offers a different grade, preferring one this family actually uses", () => {
    const plain = cmdSuggest(DONE, SETTINGS).items.find((i) => i.replaceKind === "grade");
    expect(plain?.ins).toBeDefined();
    expect(plain?.label).not.toBe("S235");

    const usage = usageStub({ topGradeIds: (fam) => (fam === "beam" ? ["stainless-304"] : []) });
    const learned = cmdSuggest(DONE, SETTINGS, undefined, usage).items.find(
      (i) => i.replaceKind === "grade",
    );
    expect(learned).toMatchObject({ label: "304" });
  });

  it("never suggests the values the query already has", () => {
    const s = cmdSuggest(DONE, SETTINGS);
    expect(s.items.every((i) => i.ins !== "x2")).toBe(true);
    expect(s.items.every((i) => i.ins !== "6m")).toBe(true);
    expect(s.items.every((i) => i.ins !== "hea120")).toBe(true);
  });

  it("skips the length variations for sheet-like families", () => {
    const s = cmdSuggest("plt1500x3000x3 x2 s235 ", SETTINGS);
    expect(s.items.some((i) => i.replaceKind === "len")).toBe(false);
    expect(s.items.some((i) => i.replaceKind === "qty")).toBe(true);
  });
});

describe("cmdApplyInsert with refine items", () => {
  const apply = (query: string, replaceKind: "qty" | "len" | "grade" | "size", ins: string) =>
    cmdApplyInsert(query, { label: ins, ins, kind: "refine", replaceKind });

  it("swaps the token that plays the role and leaves the rest alone", () => {
    expect(apply("hea120 6m x2 s235 ", "qty", "x4")).toBe("hea120 6m x4 s235 ");
    expect(apply("hea120 6m x2 s235 ", "len", "12m")).toBe("hea120 12m x2 s235 ");
    expect(apply("hea120 6m x2 s235 ", "grade", "304")).toBe("hea120 6m x2 304 ");
    expect(apply("hea120 6m x2 s235 ", "size", "hea140")).toBe("hea140 6m x2 s235 ");
  });

  it("appends when the query has no token of that kind yet", () => {
    expect(apply("hea120 6m x2 ", "grade", "s355")).toBe("hea120 6m x2 s355 ");
  });

  it("keeps working regardless of token order", () => {
    expect(apply("x2 hea120 6m ", "qty", "x5")).toBe("x5 hea120 6m ");
  });
});
