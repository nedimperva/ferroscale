import { describe, expect, it } from "vitest";
import {
  createPaintCoat,
  normalizePaintCoats,
  paintCoatKg,
  projectSurfaceM2,
  totalPaint,
} from "./paint";

describe("normalizePaintCoats", () => {
  it("turns the old three scalars into one finish coat", () => {
    const coats = normalizePaintCoats(undefined, {
      paintingPricePerKg: 6,
      paintingCoverageM2PerKg: 8,
      paintingCoats: 2,
    });
    expect(coats).toHaveLength(1);
    expect(coats[0]).toMatchObject({
      kind: "finish",
      layers: 2,
      coverageM2PerKg: 8,
      pricePerKg: 6,
    });
  });

  it("ignores a zero legacy rate", () => {
    expect(normalizePaintCoats(undefined, { paintingPricePerKg: 0 })).toEqual([]);
  });

  it("keeps an explicit coat list and drops junk", () => {
    const coats = normalizePaintCoats([
      { id: "a", kind: "primer", layers: 1, coverageM2PerKg: 7, pricePerKg: 4 },
      { kind: "nope", layers: 0, coverageM2PerKg: -1, pricePerKg: 3 },
      null,
    ]);
    expect(coats).toHaveLength(2);
    expect(coats[0]?.kind).toBe("primer");
    expect(coats[1]?.kind).toBe("custom");
    expect(coats[1]?.layers).toBe(1);
  });
});

describe("totalPaint", () => {
  it("prices primer and finish separately against the same surface", () => {
    const surface = 16;
    const primer = createPaintCoat("primer", { coverageM2PerKg: 8, pricePerKg: 4 });
    const finish = createPaintCoat("finish", { coverageM2PerKg: 8, pricePerKg: 10 });
    finish.layers = 2;
    const total = totalPaint(surface, [primer, finish]);
    // primer: 16/8 = 2 kg × 4 = 8
    // finish: 16*2/8 = 4 kg × 10 = 40
    expect(total.kg).toBe(6);
    expect(total.cost).toBe(48);
    expect(total.coats[0]?.kg).toBe(2);
    expect(total.coats[1]?.kg).toBe(4);
  });

  it("sums surface from every item that has one", () => {
    expect(
      projectSurfaceM2([
        { result: { surfaceAreaM2: 3.2 } },
        { result: { surfaceAreaM2: null } },
        { result: { surfaceAreaM2: 1.8 } },
      ]),
    ).toBe(5);
  });

  it("is zero when coverage or surface is missing", () => {
    expect(paintCoatKg(0, createPaintCoat("finish", { coverageM2PerKg: 8, pricePerKg: 5 }))).toBe(0);
  });
});
