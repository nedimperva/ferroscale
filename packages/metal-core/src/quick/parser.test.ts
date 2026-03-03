import { describe, expect, it } from "vitest";
import { parseQuickQuery } from "./parser";

describe("parseQuickQuery", () => {
  it("parses SHS shorthand with defaults", () => {
    const parsed = parseQuickQuery("shs 40x40x2x4500mm");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.request.profileId).toBe("square_hollow");
    expect(parsed.request.lengthMm).toBeCloseTo(4500);
    expect(parsed.request.quantity).toBe(1);
    expect(parsed.request.materialGradeId).toBe("steel-s235jr");
    expect(parsed.request.manualDimensionsMm.side).toBeCloseTo(40);
    expect(parsed.request.manualDimensionsMm.wallThickness).toBeCloseTo(2);
  });

  it("parses EN profile shorthand with flags", () => {
    const parsed = parseQuickQuery("ipe 200x6000 qty=3 mat=s355jr");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.request.profileId).toBe("beam_ipe_en");
    expect(parsed.request.selectedSizeId).toBe("ipe200");
    expect(parsed.request.quantity).toBe(3);
    expect(parsed.request.materialGradeId).toBe("steel-s355jr");
  });

  it("parses qty flag with spaces and uppercase key", () => {
    const parsed = parseQuickQuery("shs 40x40x2x4500mm QTY = 5");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.request.quantity).toBe(5);
  });

  it("uses explicit density override", () => {
    const parsed = parseQuickQuery("chs 60.3x3.2x3000 dens=8000");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.request.customDensityKgPerM3).toBe(8000);
  });

  it("parses sheet in width x length x thickness order", () => {
    const parsed = parseQuickQuery("sheet 1250x3000x2 qty=2");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.request.profileId).toBe("sheet");
    expect(parsed.request.lengthMm).toBeCloseTo(3000);
    expect(parsed.request.manualDimensionsMm.width).toBeCloseTo(1250);
    expect(parsed.request.manualDimensionsMm.thickness).toBeCloseTo(2);
    expect(parsed.request.quantity).toBe(2);
  });

  it("supports short alias for plate", () => {
    const parsed = parseQuickQuery("pl 1500x3000x10");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.request.profileId).toBe("plate");
    expect(parsed.request.lengthMm).toBeCloseTo(3000);
    expect(parsed.request.manualDimensionsMm.thickness).toBeCloseTo(10);
  });

  it("fails without profile alias", () => {
    const parsed = parseQuickQuery("40x40x2x4500");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(
      parsed.issues.some(
        (issue) =>
          issue.code === "unknown_alias" || issue.code === "missing_parts",
      ),
    ).toBe(true);
  });
});
