import { describe, it, expect } from "vitest";
import { calculateMetal } from "@ferroscale/metal-core";
import { cmdParse, cmdClassifyToken } from "./parser";
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
