import { describe, expect, it } from "vitest";
import { calculateQuickFromQuery } from "./calculate";

describe("calculateQuickFromQuery", () => {
  it("calculates SHS weight", () => {
    const result = calculateQuickFromQuery("shs 40x40x2x4500mm");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.unitWeightKg).toBeGreaterThan(10);
    expect(result.result.unitWeightKg).toBeLessThan(11);
    expect(result.result.totalWeightKg).toBe(result.result.unitWeightKg);
  });

  it("applies quantity and material flags", () => {
    const result = calculateQuickFromQuery("ipe 200x6000 qty=3 mat=s355");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.quantity).toBe(3);
    expect(result.result.selectedSizeId).toBe("ipe200");
    expect(result.result.totalWeightKg).toBeGreaterThan(result.result.unitWeightKg);
  });
});
