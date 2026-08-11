import { describe, it, expect } from "vitest";
import { massBand } from "./mass-band";

describe("massBand", () => {
  it("spreads the tolerance either side of the theoretical mass", () => {
    const band = massBand(100, 4)!;
    expect(band.minKg).toBeCloseTo(96, 6);
    expect(band.maxKg).toBeCloseTo(104, 6);
    expect(band.percentLabel).toBe("±4%");
    expect(band.rangeLabel).toBe("96 – 104 kg");
  });

  it("takes a fractional percentage", () => {
    const band = massBand(200, 2.5)!;
    expect(band.minKg).toBeCloseTo(195, 6);
    expect(band.maxKg).toBeCloseTo(205, 6);
  });

  it("is off at zero — the app is a calculator until you say otherwise", () => {
    expect(massBand(100, 0)).toBeNull();
  });

  it("has nothing to show without a weight", () => {
    expect(massBand(null, 4)).toBeNull();
    expect(massBand(0, 4)).toBeNull();
  });

  it("ignores nonsense rather than rendering NaN", () => {
    expect(massBand(Number.NaN, 4)).toBeNull();
    expect(massBand(100, Number.NaN)).toBeNull();
    expect(massBand(100, -5)).toBeNull();
  });
});
