import { describe, expect, it } from "vitest";
import { optimizeCutList } from "./optimizer";
import type { CutPiece } from "./types";

describe("optimizeCutList", () => {
  it("nests pieces on a single 6m bar with kerf loss", () => {
    const pieces: CutPiece[] = [
      { id: "1", label: "Part A", lengthMm: 2000, quantity: 2 },
      { id: "2", label: "Part B", lengthMm: 1500, quantity: 1 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000],
      kerfMm: 3,
      minReusableRemnantMm: 500,
    });

    expect(result.totalStockBars).toBe(1);
    expect(result.totalPiecesCount).toBe(3);
    expect(result.totalCutLengthMm).toBe(5500);
    // 3 cuts on 1 bar -> 2 saw kerfs = 6mm
    expect(result.totalKerfLossMm).toBe(6);
    // Remnant = 6000 - 5500 - 6 = 494mm (< 500mm threshold -> scrap)
    expect(result.totalRemnantMm).toBe(494);
    expect(result.totalScrapMm).toBe(494);
    expect(result.totalReusableMm).toBe(0);
    expect(result.yieldPercent).toBeCloseTo((5500 / 6000) * 100, 1);
  });

  it("splits pieces across multiple stock bars when exceeding single capacity", () => {
    const pieces: CutPiece[] = [
      { id: "1", label: "Post", lengthMm: 3500, quantity: 2 },
      { id: "2", label: "Beam", lengthMm: 2800, quantity: 2 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000],
      kerfMm: 3,
    });

    // 3500 + 2800 = 6300 > 6000. So we need at least 2 or 3 bars.
    // Bar 1: 3500 + 2497 max space -> 3500 fits with nothing else > 2500.
    // Bar 2: 3500
    // Bar 3: 2800 + 2800 + 3 = 5603 <= 6000.
    expect(result.totalStockBars).toBe(3);
    expect(result.totalPiecesCount).toBe(4);
    expect(result.totalCutLengthMm).toBe(12600);
    expect(result.totalStockLengthMm).toBe(18000);
  });

  it("chooses between 6m and 12m stock lengths to minimize bars and scrap", () => {
    const pieces: CutPiece[] = [
      { id: "1", label: "Long Chord", lengthMm: 5500, quantity: 2 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000, 12000],
      kerfMm: 3,
    });

    // 5500 + 5500 + 3 = 11003 <= 12000 mm -> 1 bar of 12m instead of 2 bars of 6m
    expect(result.totalStockBars).toBe(1);
    expect(result.patterns[0].stockLengthMm).toBe(12000);
    expect(result.totalRemnantMm).toBe(12000 - 11003);
    expect(result.patterns[0].isReusable).toBe(true);
  });

  it("marks large remnants as reusable offcuts", () => {
    const pieces: CutPiece[] = [
      { id: "1", label: "Strut", lengthMm: 2000, quantity: 2 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000],
      kerfMm: 3,
      minReusableRemnantMm: 500,
    });

    expect(result.totalStockBars).toBe(1);
    // 6000 - 4000 - 3 = 1997mm (> 500mm -> reusable)
    expect(result.patterns[0].remnantMm).toBe(1997);
    expect(result.patterns[0].isReusable).toBe(true);
    expect(result.totalReusableMm).toBe(1997);
    expect(result.totalScrapMm).toBe(0);
  });

  it("flags pieces longer than any available stock length as uncuttable", () => {
    const pieces: CutPiece[] = [
      { id: "1", label: "Overlength Beam", lengthMm: 14000, quantity: 1 },
      { id: "2", label: "Standard Post", lengthMm: 3000, quantity: 1 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000, 12000],
      kerfMm: 3,
    });

    expect(result.uncuttablePieces.length).toBe(1);
    expect(result.uncuttablePieces[0].id).toBe("1");
    expect(result.totalPiecesCount).toBe(1);
    expect(result.totalStockBars).toBe(1);
  });

  it("calculates exact start and end millimetre offsets on each bar", () => {
    const pieces: CutPiece[] = [
      { id: "a", label: "A", lengthMm: 1000, quantity: 1 },
      { id: "b", label: "B", lengthMm: 2000, quantity: 1 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000],
      kerfMm: 4,
      trimMm: 10,
    });

    const bar = result.patterns[0];
    expect(bar.cuts.length).toBe(2);
    // Sort order: B (2000) then A (1000)
    expect(bar.cuts[0].startMm).toBe(10);
    expect(bar.cuts[0].endMm).toBe(2010);
    expect(bar.cuts[1].startMm).toBe(2010 + 4); // 2014
    expect(bar.cuts[1].endMm).toBe(2014 + 1000); // 3014
    expect(bar.remnantMm).toBe(6000 - 3014); // 2986
  });

  it("mixes 12m and 6m stock bars to minimize total purchased length and waste", () => {
    // Pieces totaling ~16.5m: 2x 5.5m + 1x 5.5m -> 1x 12m bar (holds 2x 5.5m = 11m) + 1x 6m bar (holds 1x 5.5m)
    // Total stock = 18m (instead of 2x 12m = 24m or 4x 6m = 24m)
    const pieces: CutPiece[] = [
      { id: "chord", label: "Chord", lengthMm: 5500, quantity: 3 },
    ];

    const result = optimizeCutList(pieces, {
      stockLengthsMm: [6000, 12000],
      kerfMm: 3,
    });

    expect(result.totalStockBars).toBe(2);
    expect(result.totalStockLengthMm).toBe(18000);
    const stockLengths = result.patterns.map((p) => p.stockLengthMm).sort((a, b) => b - a);
    expect(stockLengths).toEqual([12000, 6000]);
    expect(result.yieldPercent).toBeGreaterThan(90);
  });
});
