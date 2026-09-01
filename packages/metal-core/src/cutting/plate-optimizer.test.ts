import { describe, expect, it } from "vitest";
import { optimizePlateCutList } from "./plate-optimizer";
import type { PlatePiece } from "./plate-types";

describe("optimizePlateCutList", () => {
  it("packs rectangular pieces onto a single 1500x3000 mm master plate", () => {
    const pieces: PlatePiece[] = [
      { id: "p1", label: "Base plate A", widthMm: 500, lengthMm: 1000, quantity: 4 },
      { id: "p2", label: "Gusset B", widthMm: 400, lengthMm: 400, quantity: 2 },
    ];

    const result = optimizePlateCutList(pieces, {
      standardSheets: [{ label: "1500 × 3000 mm", widthMm: 1500, lengthMm: 3000 }],
      kerfMm: 3,
      edgeTrimMm: 10,
      allowRotation: true,
    });

    expect(result.totalMasterSheets).toBe(1);
    expect(result.totalPiecesCount).toBe(6);
    // Useful area: 4 * (0.5 * 1.0) + 2 * (0.4 * 0.4) = 2.0 + 0.32 = 2.32 m²
    expect(result.totalCutAreaM2).toBeCloseTo(2.32, 2);
    // Master plate: 1.5 * 3.0 = 4.5 m²
    expect(result.totalMasterAreaM2).toBeCloseTo(4.5, 2);
    expect(result.yieldPercent).toBeGreaterThan(50);
  });

  it("rotates pieces 90° if needed to fit into available width", () => {
    const pieces: PlatePiece[] = [
      // A piece that is 1400 wide and 600 long fits in a 1000x2000 sheet ONLY when rotated (600x1400)
      { id: "p1", label: "Long bracket", widthMm: 1400, lengthMm: 600, quantity: 1 },
    ];

    const result = optimizePlateCutList(pieces, {
      standardSheets: [{ label: "1000 × 2000 mm", widthMm: 1000, lengthMm: 2000 }],
      kerfMm: 2,
      edgeTrimMm: 10,
      allowRotation: true,
    });

    expect(result.totalMasterSheets).toBe(1);
    expect(result.patterns[0].cuts[0].rotated).toBe(true);
  });

  it("splits across multiple master plates when piece count exceeds sheet capacity", () => {
    const pieces: PlatePiece[] = [
      { id: "p1", label: "Big panel", widthMm: 1200, lengthMm: 2000, quantity: 4 },
    ];

    const result = optimizePlateCutList(pieces, {
      standardSheets: [{ label: "1500 × 3000 mm", widthMm: 1500, lengthMm: 3000 }],
      kerfMm: 3,
      edgeTrimMm: 10,
    });

    // 1500x3000 sheet can hold at most 1 panel of 1200x2000 mm (since 2x1200=2400 > 1500 and 2x2000=4000 > 3000)
    expect(result.totalMasterSheets).toBe(4);
    expect(result.totalPiecesCount).toBe(4);
  });

  it("flags pieces exceeding master plate format dimensions as uncuttable", () => {
    const pieces: PlatePiece[] = [
      { id: "huge", label: "Giant plate", widthMm: 2500, lengthMm: 7000, quantity: 1 },
      { id: "normal", label: "Standard piece", widthMm: 500, lengthMm: 500, quantity: 1 },
    ];

    const result = optimizePlateCutList(pieces, {
      standardSheets: [{ label: "1500 × 3000 mm", widthMm: 1500, lengthMm: 3000 }],
    });

    expect(result.uncuttablePieces.length).toBe(1);
    expect(result.uncuttablePieces[0].id).toBe("huge");
    expect(result.totalPiecesCount).toBe(1);
  });

  it("correctly nests 10 pieces of 1240x200 mm into 2 columns on a single 1500x3000 mm sheet", () => {
    const pieces: PlatePiece[] = [
      { id: "cut1", label: "1240×200 mm", widthMm: 200, lengthMm: 1240, quantity: 10 },
    ];

    const result = optimizePlateCutList(pieces, {
      standardSheets: [{ label: "1500 × 3000 mm", widthMm: 1500, lengthMm: 3000 }],
      kerfMm: 3,
      edgeTrimMm: 10,
      allowRotation: true,
    });

    // All 10 pieces must fit on 1 master plate in multiple columns (since 2x1240 = 2480 <= 3000 and 5x200 = 1000 <= 1500)
    expect(result.totalMasterSheets).toBe(1);
    expect(result.totalPiecesCount).toBe(10);
    expect(result.uncuttablePieces.length).toBe(0);

    const sheet = result.patterns[0];
    // Check that cuts are placed at multiple distinct X columns
    const xCoords = new Set(sheet.cuts.map((c) => c.xMm));
    expect(xCoords.size).toBeGreaterThanOrEqual(2);
  });
});
