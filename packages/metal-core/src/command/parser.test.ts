import { describe, it, expect } from "vitest";
import { calculateMetal } from "@ferroscale/metal-core";
import { cmdParse, cmdClassifyToken, cmdTokenize, inputToQuery } from "./parser";
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

describe("cmdParse", () => {
  it("parses a full query and matches the engine's result", () => {
    const p = cmdParse("hea120 6m x2 s235", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.calc).not.toBeNull();
    expect(p.realQty).toBe(2);
    expect(p.gradeId).toBe("steel-s235jr");

    const direct = calculateMetal(p.calc!.input);
    expect(direct.ok).toBe(true);
    if (direct.ok) {
      expect(p.totalKg).toBe(direct.result.totalWeightKg);
      expect(p.totalAmount).toBe(direct.result.grandTotalAmount);
    }
  });

  it("pricing settings flow into the total (waste + VAT)", () => {
    const plain = cmdParse("hea120 6m", mkSettings());
    const priced = cmdParse(
      "hea120 6m",
      mkSettings({
        pricing: { ...PRICING, unitPrice: 2.5, wastePercent: 8, includeVat: true, vatPercent: 21 },
      }),
    );
    expect(plain.valid).toBe(true);
    expect(priced.valid).toBe(true);
    // the engine bakes waste into total weight (material to order)
    expect(priced.totalKg!).toBeCloseTo(plain.totalKg! * 1.08, 6);
    expect(priced.totalAmount!).toBeGreaterThan(plain.totalAmount!);
    expect(priced.calc!.result.wasteAmount).toBeGreaterThan(0);
    expect(priced.calc!.result.vatAmount).toBeGreaterThan(0);
    expect(priced.calc!.result.grandTotalAmount).toBe(priced.totalAmount);
  });

  it("overrides the shared unit price from a command token", () => {
    const defaultPrice = cmdParse("hea120 6m", mkSettings());
    const override = cmdParse("hea120 6m @2.50/kg", mkSettings());
    expect(defaultPrice.valid).toBe(true);
    expect(override.valid).toBe(true);
    expect(override.priceOverride).toEqual({
      unitPrice: 2.5,
      priceBasis: "weight",
      priceUnit: "kg",
    });
    expect(override.calc!.input.unitPrice).toBe(2.5);
    expect(override.calc!.input.priceBasis).toBe("weight");
    expect(override.calc!.input.priceUnit).toBe("kg");
    expect(override.totalAmount).toBeGreaterThan(defaultPrice.totalAmount!);
  });

  it("supports length and piece price override units", () => {
    const perMetre = cmdParse("flt40x8 4m 3,20/m", mkSettings());
    const perPiece = cmdParse("flt40x8 4m x2 @12/pc", mkSettings());
    expect(perMetre.valid).toBe(true);
    expect(perMetre.calc!.input.unitPrice).toBe(3.2);
    expect(perMetre.calc!.input.priceBasis).toBe("length");
    expect(perMetre.calc!.input.priceUnit).toBe("m");
    expect(perPiece.valid).toBe(true);
    expect(perPiece.calc!.input.unitPrice).toBe(12);
    expect(perPiece.calc!.input.priceBasis).toBe("piece");
    expect(perPiece.calc!.input.priceUnit).toBe("piece");
  });

  it("supports value-only override tokens with the current price unit", () => {
    const p = cmdParse(
      "hea120 6m @2.5",
      mkSettings({ pricing: { ...PRICING, priceBasis: "length", priceUnit: "ft" } }),
    );
    expect(p.valid).toBe(true);
    expect(p.calc!.input.unitPrice).toBe(2.5);
    expect(p.calc!.input.priceBasis).toBe("length");
    expect(p.calc!.input.priceUnit).toBe("ft");
  });

  it("bare number uses the default length unit (m)", () => {
    const p = cmdParse("hea120 6 x2", mkSettings({ defaultLengthUnit: "m" }));
    expect(p.valid).toBe(true);
    expect(p.lengthM).toBe(6);
    expect(p.lengthExplicit).toBe(false);
  });

  it("bare number uses the default length unit (mm)", () => {
    const p = cmdParse("rnd20 6000", mkSettings({ defaultLengthUnit: "mm" }));
    expect(p.valid).toBe(true);
    expect(p.lengthM).toBe(6);
  });

  it("supports explicit ft and in units", () => {
    const ft = cmdParse("flt40x8 10ft", mkSettings());
    expect(ft.valid).toBe(true);
    expect(ft.lengthM).toBeCloseTo(3.048, 4);
    expect(ft.lengthExplicit).toBe(true);

    const inch = cmdParse("rnd20 12in", mkSettings());
    expect(inch.lengthM).toBeCloseTo(0.3048, 4);
  });

  it("grade tokens win over bare-number lengths", () => {
    const p = cmdParse("rnd20 6m 304", mkSettings());
    expect(p.gradeId).toBe("stainless-304");
    expect(p.lengthM).toBe(6);
    // 304 density fixed at the real EN value
    expect(p.density).toBe(7930);
  });

  it("gradeId stays null when no grade is typed (suggestion stage relies on it)", () => {
    const p = cmdParse("hea120 6m x2", mkSettings());
    expect(p.gradeId).toBeNull();
    expect(p.calc!.input.materialGradeId).toBe("steel-s235jr");
  });

  it("resolves the expanded grade set", () => {
    expect(cmdParse("shs40x40x3 6m s420", mkSettings()).gradeId).toBe("steel-s420m");
    expect(cmdParse("l50x50x5 3m 7075", mkSettings()).gradeId).toBe("al-7075");
    expect(cmdParse("chs60.3x3.2 3m 316", mkSettings()).gradeId).toBe("stainless-316");
  });

  it("is invalid without a length but still provides kg/m", () => {
    const p = cmdParse("hea120", mkSettings());
    expect(p.valid).toBe(false);
    expect(p.calc).toBeNull();
    expect(p.kgm).not.toBeNull();
    expect(p.kgm!).toBeGreaterThan(15); // HEA 120 ≈ 19.9 kg/m
  });

  it("uses the shared default grade when none is typed", () => {
    const p = cmdParse("hea120 6m", mkSettings({ defaultGradeId: "stainless-316l" }));
    expect(p.gradeId).toBeNull();
    expect(p.calc!.input.materialGradeId).toBe("stainless-316l");
    expect(p.density).toBe(8000);
  });

  it("parses panels as a single piece: width × length × thickness", () => {
    const p = cmdParse("plt1500x3000x3", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.alias?.fam).toBe("panel");
    // Thin → routes to the "sheet" backing profile (EN 10051)
    expect(p.calc!.input.profileId).toBe("sheet");
    expect(p.calc!.input.manualDimensions.width).toEqual({ value: 1500, unit: "mm" });
    expect(p.calc!.input.manualDimensions.thickness).toEqual({ value: 3, unit: "mm" });
    expect(p.calc!.input.length).toEqual({ value: 3000, unit: "mm" });
    expect(p.lengthM).toBe(3);
    expect(p.lengthRaw).toBe(3000);
    expect(p.lengthUnit).toBe("mm");
  });

  it("the sht alias still works (backward compat) — same family as plt", () => {
    const p = cmdParse("sht1500x3000x2", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.alias?.fam).toBe("panel");
    expect(p.calc!.input.profileId).toBe("sheet");
  });

  it("thicker panels route to the plate backing profile (EN 10029)", () => {
    const p = cmdParse("plt200x40x10", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.alias?.fam).toBe("panel");
    expect(p.calc!.input.profileId).toBe("plate");
    expect(p.calc!.input.manualDimensions.width).toEqual({ value: 200, unit: "mm" });
    expect(p.calc!.input.manualDimensions.thickness).toEqual({ value: 10, unit: "mm" });
    expect(p.calc!.input.length).toEqual({ value: 40, unit: "mm" });
  });

  it("the 6 mm boundary picks sheet for ≤ 6, plate for > 6", () => {
    expect(cmdParse("plt1500x3000x6", mkSettings()).calc!.input.profileId).toBe("sheet");
    expect(cmdParse("plt1500x3000x6.5", mkSettings()).calc!.input.profileId).toBe("plate");
    expect(cmdParse("plt1500x3000x8", mkSettings()).calc!.input.profileId).toBe("plate");
  });

  it("parses panels with quantity", () => {
    const p = cmdParse("plt1500x3000x10 x4", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.alias?.fam).toBe("panel");
    expect(p.realQty).toBe(4);
    expect(p.calc!.input.length).toEqual({ value: 3000, unit: "mm" });
  });

  it("parses chequered plates: width × length × thickness × patternHeight", () => {
    const p = cmdParse("chq1500x3000x5x2", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.alias?.fam).toBe("chequered");
    expect(p.calc!.input.manualDimensions.width).toEqual({ value: 1500, unit: "mm" });
    expect(p.calc!.input.manualDimensions.thickness).toEqual({ value: 5, unit: "mm" });
    expect(p.calc!.input.manualDimensions.patternHeight).toEqual({ value: 2, unit: "mm" });
    expect(p.calc!.input.length).toEqual({ value: 3000, unit: "mm" });
  });

  it("parses tees as a standard EN profile", () => {
    const p = cmdParse("t30x4 6m", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.alias?.fam).toBe("tee");
    expect(p.calc!.input.profileId).toBe("tee_en");
    expect(p.calc!.input.selectedSizeId).toBe("t30x4");
  });
});

describe("cmdTokenize (space-free input)", () => {
  it("splits a glued standard profile + length", () => {
    expect(cmdTokenize("hea1006m")).toEqual(["hea100", "6m"]);
    expect(cmdTokenize("hea100 6m")).toEqual(["hea100", "6m"]);
  });

  it("splits the whole glued chain: size + length + qty + grade", () => {
    expect(cmdTokenize("hea1206mx2s235")).toEqual(["hea120", "6m", "x2", "s235"]);
    expect(cmdTokenize("6mx2")).toEqual(["6m", "x2"]);
  });

  it("prefers the longest valid size head (hea1000 exists)", () => {
    expect(cmdTokenize("hea1000")).toEqual(["hea1000"]);
    expect(cmdTokenize("hea10006m")).toEqual(["hea1000", "6m"]);
  });

  it("splits a trailing bare number while it is being typed", () => {
    expect(cmdTokenize("hea1206")).toEqual(["hea120", "6"]);
  });

  it("splits manual-family dims when the boundary is unambiguous", () => {
    expect(cmdTokenize("shs40x40x36m")).toEqual(["shs40x40x3", "6m"]);
    expect(cmdTokenize("l50x50x56m")).toEqual(["l50x50x5", "6m"]);
  });

  it("keeps ambiguous manual dims whole (never guesses)", () => {
    // flat 40x412m could be 40x4 + 12m or 40x41 + 2m
    expect(cmdTokenize("flt40x412m")).toEqual(["flt40x412m"]);
    // round 206m could be 2 + 06m or 20 + 6m
    expect(cmdTokenize("rnd206m")).toEqual(["rnd206m"]);
  });

  it("never splits sheet-like families (length is baked into the size)", () => {
    expect(cmdTokenize("plt1500x3000x3")).toEqual(["plt1500x3000x3"]);
    expect(cmdTokenize("chq1500x3000x5x2")).toEqual(["chq1500x3000x5x2"]);
  });

  it("leaves unknown junk and clean tokens untouched", () => {
    expect(cmdTokenize("foo123bar")).toEqual(["foo123bar"]);
    expect(cmdTokenize("hea120")).toEqual(["hea120"]);
    expect(cmdTokenize("304")).toEqual(["304"]);
    expect(cmdTokenize("")).toEqual([]);
  });

  it("preserves the original casing of pieces", () => {
    expect(cmdTokenize("HEA1006M")).toEqual(["HEA100", "6M"]);
  });
});

describe("cmdTokenize (natural-language folding)", () => {
  it("merges a spaced alias + size once both are committed", () => {
    expect(cmdTokenize("hea 120 ")).toEqual(["hea120"]);
    expect(cmdTokenize("l 50x50x5 ")).toEqual(["l50x50x5"]);
    expect(cmdTokenize("t 30x4 ")).toEqual(["t30x4"]);
  });

  it("leaves the trailing word alone while it is still being typed", () => {
    // "120" has no trailing space → still editable, not yet folded onto "hea"
    expect(cmdTokenize("hea 120")).toEqual(["hea", "120"]);
  });

  it("folds spoken length units (word and abbreviation)", () => {
    expect(cmdTokenize("hea120 6 meters ")).toEqual(["hea120", "6m"]);
    expect(cmdTokenize("hea120 6 m ")).toEqual(["hea120", "6m"]);
    expect(cmdTokenize("rnd20 6000 mm ")).toEqual(["rnd20", "6000mm"]);
  });

  it("folds spoken quantities", () => {
    expect(cmdTokenize("hea120 6m 2 pieces ")).toEqual(["hea120", "6m", "x2"]);
    expect(cmdTokenize("hea120 6m 2 kom ")).toEqual(["hea120", "6m", "x2"]);
    expect(cmdTokenize("hea120 6m x 2 ")).toEqual(["hea120", "6m", "x2"]);
  });

  it("computes the same result from spoken and canonical forms", () => {
    const spoken = cmdParse("hea 120 6 meters x2 s235 ", mkSettings());
    const canonical = cmdParse("hea120 6m x2 s235 ", mkSettings());
    expect(spoken.valid).toBe(true);
    expect(spoken.totalKg).toBe(canonical.totalKg);
    expect(spoken.realQty).toBe(2);
  });
});

describe("cmdParse did-you-mean suggestions", () => {
  it("suggests the nearest alias for a mistyped profile (transposition)", () => {
    const p = cmdParse("hae120 ", mkSettings());
    expect(p.issues[0]).toMatchObject({
      code: "unknownToken",
      token: "hae120",
      suggestion: "hea120",
    });
  });

  it("suggests the nearest grade code for a mistyped grade", () => {
    const p = cmdParse("hea120 6m s356 ", mkSettings());
    const issue = p.issues.find((x) => x.code === "unknownToken");
    expect(issue?.suggestion).toBe("s355");
  });

  it("suggests the nearest catalog size for an off-catalog standard size", () => {
    const p = cmdParse("hea125 ", mkSettings());
    expect(p.issues[0]).toMatchObject({
      code: "unknownSize",
      suggestion: "120",
    });
  });

  it("offers no suggestion for genuinely unrecognizable input", () => {
    const p = cmdParse("hea120 zzqqx ", mkSettings());
    const issue = p.issues.find((x) => x.code === "unknownToken");
    expect(issue?.suggestion).toBeUndefined();
  });
});

describe("cmdParse with glued queries", () => {
  it("hea1006m parses identically to hea100 6m", () => {
    const spaced = cmdParse("hea100 6m", mkSettings());
    const glued = cmdParse("hea1006m", mkSettings());
    expect(glued.valid).toBe(true);
    expect(glued.totalKg).toBe(spaced.totalKg);
    expect(glued.selectedSizeId).toBe("hea100");
    expect(glued.lengthM).toBe(6);
  });

  it("full glued chain matches the spaced query", () => {
    const spaced = cmdParse("hea120 6m x2 s355", mkSettings());
    const glued = cmdParse("hea1206mx2s355", mkSettings());
    expect(glued.valid).toBe(true);
    expect(glued.realQty).toBe(2);
    expect(glued.gradeId).toBe("steel-s355jr");
    expect(glued.totalKg).toBe(spaced.totalKg);
    expect(glued.totalAmount).toBe(spaced.totalAmount);
  });

  it("splits glued price tokens", () => {
    const p = cmdParse("hea1206m@2.5/kg", mkSettings());
    expect(cmdTokenize("hea1206m@2.5/kg")).toEqual(["hea120", "6m", "@2.5/kg"]);
    expect(p.valid).toBe(true);
    expect(p.calc!.input.unitPrice).toBe(2.5);
  });

  it("glued length + qty after a spaced profile", () => {
    const p = cmdParse("hea120 6mx2", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.lengthM).toBe(6);
    expect(p.realQty).toBe(2);
  });

  it("explicit unit still beats a numeric grade alias when glued", () => {
    const p = cmdParse("hea120 6m304", mkSettings());
    expect(p.lengthM).toBe(6);
    expect(p.gradeId).toBe("stainless-304");
  });

  it("ambiguous glue stays invalid rather than guessing dims", () => {
    const p = cmdParse("flt40x412m", mkSettings());
    expect(p.valid).toBe(false);
  });
});

describe("inputToQuery", () => {
  it("round-trips a standard beam query", () => {
    const settings = mkSettings();
    const p = cmdParse("hea120 6m x2 s355", settings);
    expect(p.valid).toBe(true);
    const reQuery = inputToQuery(p.calc!.input, "m");
    expect(reQuery).toBe("hea120 6m x2 s355");
    const p2 = cmdParse(reQuery, settings);
    expect(p2.calc!.input.profileId).toBe(p.calc!.input.profileId);
    expect(p2.calc!.input.selectedSizeId).toBe(p.calc!.input.selectedSizeId);
    expect(p2.calc!.result.grandTotalAmount).toBe(p.calc!.result.grandTotalAmount);
  });

  it("round-trips a saved price override when it differs from current defaults", () => {
    const settings = mkSettings();
    const p = cmdParse("hea120 6m @2.5/kg", settings);
    expect(p.valid).toBe(true);
    const reQuery = inputToQuery(p.calc!.input, "m", {
      defaultGradeId: settings.defaultGradeId,
      defaultPricing: settings.pricing,
    });
    expect(reQuery).toBe("hea120 6m @2.5/kg");
    const p2 = cmdParse(reQuery, settings);
    expect(p2.calc!.result.grandTotalAmount).toBe(p.calc!.result.grandTotalAmount);
  });

  it("round-trips SHS / CHS / round / flat / angle", () => {
    const settings = mkSettings();
    for (const q of [
      "shs40x40x3 6m",
      "chs60.3x3.2 3m x6 s235",
      "rnd20 6m",
      "flt40x8 4m",
      "l50x50x5 3m",
    ]) {
      const p = cmdParse(q, settings);
      expect(p.valid, q).toBe(true);
      const re = inputToQuery(p.calc!.input, "m", { defaultGradeId: settings.defaultGradeId });
      const p2 = cmdParse(re, settings);
      expect(p2.calc!.result.totalWeightKg, q).toBeCloseTo(p.calc!.result.totalWeightKg, 6);
    }
  });

  it("omits the grade token when it matches the user's default", () => {
    const p = cmdParse("hea120 6m s235", mkSettings());
    const re = inputToQuery(p.calc!.input, "m", { defaultGradeId: "steel-s235jr" });
    expect(re).toBe("hea120 6m");
  });

  it("emits the grade token when it differs from the default", () => {
    const p = cmdParse("hea120 6m s355", mkSettings());
    const re = inputToQuery(p.calc!.input, "m", { defaultGradeId: "steel-s235jr" });
    expect(re).toBe("hea120 6m s355");
  });

  it("returns empty string for profiles without a Command alias", () => {
    const p = cmdParse("hea120 6m", mkSettings());
    const input = { ...p.calc!.input, profileId: "sheet" as const };
    expect(inputToQuery(input, "m")).toBe("");
  });

  it("round-trips panels without a separate length token (canonical alias = plt)", () => {
    const settings = mkSettings();
    // Even if the user typed "sht", round-trip normalizes to canonical "plt".
    const p = cmdParse("sht1500x3000x3 x4", settings);
    expect(p.valid).toBe(true);
    const q = inputToQuery(p.calc!.input, "m", { defaultGradeId: settings.defaultGradeId });
    expect(q).toBe("plt1500x3000x3 x4");
  });

  it("round-trips thick plates", () => {
    const settings = mkSettings();
    const p = cmdParse("plt1500x3000x10", settings);
    expect(p.valid).toBe(true);
    const q = inputToQuery(p.calc!.input, "m", { defaultGradeId: settings.defaultGradeId });
    expect(q).toBe("plt1500x3000x10");
  });

  it("round-trips chequered plates", () => {
    const settings = mkSettings();
    const p = cmdParse("chq1500x3000x5x2", settings);
    expect(p.valid).toBe(true);
    const q = inputToQuery(p.calc!.input, "m", { defaultGradeId: settings.defaultGradeId });
    expect(q).toBe("chq1500x3000x5x2");
  });
});

describe("cmdClassifyToken", () => {
  it("classifies grades before bare numbers", () => {
    expect(cmdClassifyToken("304")).toBe("grade");
    expect(cmdClassifyToken("s355")).toBe("grade");
  });

  it("classifies bare numbers and unit suffixes as lengths", () => {
    expect(cmdClassifyToken("6")).toBe("len");
    expect(cmdClassifyToken("6m")).toBe("len");
    expect(cmdClassifyToken("10ft")).toBe("len");
    expect(cmdClassifyToken("12in")).toBe("len");
  });

  it("classifies price override tokens", () => {
    expect(cmdClassifyToken("@2.5/kg")).toBe("price");
    expect(cmdClassifyToken("3,20/m")).toBe("price");
  });

  it("classifies profiles and quantities", () => {
    expect(cmdClassifyToken("hea120")).toBe("profile");
    expect(cmdClassifyToken("x2")).toBe("qty");
  });
});

describe("cmdParse issues", () => {
  it("returns no issues for a clean query", () => {
    expect(cmdParse("hea120 6m x2 s235 ", mkSettings()).issues).toEqual([]);
  });

  it("flags an unrecognized committed token but keeps the rest valid", () => {
    const p = cmdParse("hea120 zzz 6m ", mkSettings());
    expect(p.valid).toBe(true);
    expect(p.issues).toHaveLength(1);
    expect(p.issues[0]).toMatchObject({ code: "unknownToken", token: "zzz" });
  });

  it("does not flag the trailing token while it is still being typed", () => {
    expect(cmdParse("hea120 6m zz", mkSettings()).issues).toEqual([]);
    expect(cmdParse("hea120 6m zz ", mkSettings()).issues).toHaveLength(1);
  });

  it("flags an unknown standard size once the token is committed", () => {
    expect(cmdParse("hea999", mkSettings()).issues).toEqual([]); // still typing
    const p = cmdParse("hea999 ", mkSettings());
    expect(p.valid).toBe(false);
    expect(p.issues[0]).toMatchObject({
      code: "unknownSize",
      params: { profile: "HEA", size: "999" },
    });
  });

  it("flags a quantity below one", () => {
    const p = cmdParse("hea120 6m x0 ", mkSettings());
    expect(p.valid).toBe(false);
    expect(p.issues[0]).toMatchObject({ code: "invalidQty", token: "x0" });
  });

  it("surfaces engine validation failures as invalidGeometry", () => {
    // Pipe wall thickness must be below the outer radius.
    const p = cmdParse("chs20x15 6m ", mkSettings());
    expect(p.valid).toBe(false);
    expect(p.issues[0]?.code).toBe("invalidGeometry");
    expect(p.issues[0]?.message.length).toBeGreaterThan(0);
  });
});
