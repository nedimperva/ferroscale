import { describe, expect, it } from "vitest";
import {
  feetToMeters,
  fromMillimeters,
  kilogramsToPounds,
  metersToFeet,
  poundsToKilograms,
  toMillimeters,
} from "@/lib/calculator/units";

describe("unit conversions", () => {
  it("round-trips length conversions", () => {
    const original = 1234.56;
    const mm = toMillimeters(original, "mm");
    const cm = fromMillimeters(mm, "cm");
    const meters = fromMillimeters(mm, "m");
    const inches = fromMillimeters(mm, "in");
    const feet = fromMillimeters(mm, "ft");

    expect(mm).toBeCloseTo(1234.56, 8);
    expect(cm).toBeCloseTo(123.456, 8);
    expect(meters).toBeCloseTo(1.23456, 8);
    expect(inches).toBeCloseTo(48.604724, 6);
    expect(feet).toBeCloseTo(4.0503937, 6);
  });

  it("round-trips weight conversions", () => {
    const kg = 10;
    const lb = kilogramsToPounds(kg);
    const kgAgain = poundsToKilograms(lb);

    expect(lb).toBeCloseTo(22.046226, 6);
    expect(kgAgain).toBeCloseTo(10, 8);
  });

  it("converts between feet and meters", () => {
    expect(metersToFeet(1)).toBeCloseTo(3.2808399, 6);
    expect(feetToMeters(10)).toBeCloseTo(3.048, 6);
  });
});
