import { describe, it, expect } from "vitest";
import { calculateMetal } from "@ferroscale/metal-core";
import { cmdParse, cmdClassifyToken, cmdTokenize, inputToQuery } from "./parser";
import type { CommandParserSettings } from "./types";
import type { CommandPricing } from "@/lib/settings-stores";

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

  it("classifies profiles and quantities", () => {
    expect(cmdClassifyToken("hea120")).toBe("profile");
    expect(cmdClassifyToken("x2")).toBe("qty");
  });
});
