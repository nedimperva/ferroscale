import { describe, it, expect } from "vitest";
import { checkStockSize, getStockSizes } from "./stock-sizes";
import { ANGLE_CATALOG } from "./profiles/angles";

describe("stock sizes", () => {
  it("lists every size once, across its sources", () => {
    for (const id of ["round_bar", "square_bar", "flat_bar", "square_hollow", "rectangular_tube", "pipe", "angle", "plate"] as const) {
      const sizes = getStockSizes(id);
      expect(sizes.length, id).toBeGreaterThan(0);
      const keys = sizes.map((s) => JSON.stringify(s.dims));
      expect(new Set(keys).size, id).toBe(keys.length);
    }
    // EN 10219-2 and EN 10210-2 both list SHS 100×100×5.
    const shs = getStockSizes("square_hollow").find((s) => s.dims.side === 100 && s.dims.wallThickness === 5);
    expect(shs?.sources).toEqual(["en-10219-2", "en-10210-2"]);
  });

  it("transcribes hollow sections that are physically possible", () => {
    for (const { dims } of getStockSizes("square_hollow")) expect(dims.wallThickness! * 2).toBeLessThan(dims.side!);
    for (const { dims } of getStockSizes("pipe")) expect(dims.wallThickness! * 2).toBeLessThan(dims.outerDiameter!);
    for (const { dims } of getStockSizes("rectangular_tube")) {
      expect(dims.width!).toBeGreaterThan(dims.height!);
      expect(dims.wallThickness! * 2).toBeLessThan(dims.height!);
    }
  });

  it("offers exactly the angle catalogue", () => {
    expect(getStockSizes("angle")).toHaveLength(ANGLE_CATALOG.length);
  });

  it("knows a standard size, in either orientation", () => {
    expect(checkStockSize("square_hollow", { side: 40, wallThickness: 3 })?.standard).toBe(true);
    expect(checkStockSize("rectangular_tube", { width: 40, height: 60, wallThickness: 3 })?.standard).toBe(true);
    expect(checkStockSize("pipe", { outerDiameter: 48.3, wallThickness: 3.2 })?.standard).toBe(true);
    expect(checkStockSize("round_bar", { diameter: 36 })?.standard).toBe(true);
    expect(checkStockSize("plate", { width: 1500, thickness: 10 })?.standard).toBe(true);
  });

  it("names the nearest standard sizes for one that is not", () => {
    const check = checkStockSize("square_hollow", { side: 45, wallThickness: 3 });
    expect(check?.standard).toBe(false);
    expect(check?.sources).toEqual(["en-10219-2", "en-10210-2"]);
    expect(check?.nearest).toHaveLength(3);
    expect(check?.nearest).toContainEqual({ side: 40, wallThickness: 3 });
    expect(check?.nearest).toContainEqual({ side: 50, wallThickness: 3 });
  });

  it("keeps a tall-first RHS tall-first in its suggestions", () => {
    const check = checkStockSize("rectangular_tube", { width: 40, height: 60, wallThickness: 3.5 });
    expect(check?.standard).toBe(false);
    for (const dims of check!.nearest) expect(dims.width!).toBeLessThan(dims.height!);
  });

  it("says nothing outside the range a list covers", () => {
    // Merchant square bar stops at 50 mm, EN 10060 round at 250 mm, plate at 40 mm.
    expect(checkStockSize("square_bar", { side: 60 })).toBeNull();
    expect(checkStockSize("round_bar", { diameter: 300 })).toBeNull();
    expect(checkStockSize("plate", { width: 1500, thickness: 60 })).toBeNull();
    // No list at all.
    expect(checkStockSize("chequered_plate", { width: 1500, thickness: 5, patternHeight: 2 })).toBeNull();
  });
});
