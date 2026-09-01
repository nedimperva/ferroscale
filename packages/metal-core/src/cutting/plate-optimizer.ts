import {
  STANDARD_EURO_SHEET_FORMATS,
  type PlacedPlateCut,
  type PlateOptimizationResult,
  type PlateOptimizerOptions,
  type PlatePattern,
  type PlatePiece,
  type PlateSheetOption,
} from "./plate-types";

const DEFAULT_KERF_MM = 3;
const DEFAULT_EDGE_TRIM_MM = 10;

interface UnplacedRect {
  pieceId: string;
  label?: string;
  widthMm: number;
  lengthMm: number;
  areaMm2: number;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  l: number;
}

interface WorkingSheet {
  sheetId: string;
  formatLabel: string;
  sheetWidthMm: number;
  sheetLengthMm: number;
  cuts: PlacedPlateCut[];
  freeRects: FreeRect[];
}

function canFit(free: FreeRect, w: number, l: number): boolean {
  return w <= free.w && l <= free.l;
}

/**
 * Optimizes 2D rectangular plate and sheet cutting nesting.
 * Uses 2D bin packing with rotation and kerf spacing against standard European
 * master sheet formats (1000×2000, 1250×2500, 1500×3000, 2000×6000, or custom).
 */
export function optimizePlateCutList(
  pieces: PlatePiece[],
  options: PlateOptimizerOptions = {},
): PlateOptimizationResult {
  const standardSheets = (
    options.standardSheets && options.standardSheets.length > 0
      ? options.standardSheets
      : STANDARD_EURO_SHEET_FORMATS
  ).filter((s) => s.widthMm > 0 && s.lengthMm > 0);

  const availableSheets = standardSheets.length > 0 ? standardSheets : STANDARD_EURO_SHEET_FORMATS;
  const kerfMm = Math.max(0, options.kerfMm ?? DEFAULT_KERF_MM);
  const edgeTrimMm = Math.max(0, options.edgeTrimMm ?? DEFAULT_EDGE_TRIM_MM);
  const allowRotation = options.allowRotation ?? true;

  const maxSheetW = Math.max(...availableSheets.map((s) => s.widthMm));
  const maxSheetL = Math.max(...availableSheets.map((s) => s.lengthMm));
  const usableMaxW = maxSheetW - 2 * edgeTrimMm;
  const usableMaxL = maxSheetL - 2 * edgeTrimMm;

  const unplaced: UnplacedRect[] = [];
  const uncuttablePieces: PlatePiece[] = [];

  // Expand quantities and check size limits
  for (const piece of pieces) {
    if (
      !Number.isFinite(piece.widthMm) ||
      !Number.isFinite(piece.lengthMm) ||
      piece.widthMm <= 0 ||
      piece.lengthMm <= 0 ||
      piece.quantity <= 0
    ) {
      continue;
    }

    const fitsNormal = piece.widthMm <= usableMaxW && piece.lengthMm <= usableMaxL;
    const fitsRotated = allowRotation && piece.lengthMm <= usableMaxW && piece.widthMm <= usableMaxL;

    if (!fitsNormal && !fitsRotated) {
      uncuttablePieces.push(piece);
      continue;
    }

    const count = Math.floor(piece.quantity);
    for (let i = 0; i < count; i++) {
      unplaced.push({
        pieceId: piece.id,
        label: piece.label,
        widthMm: piece.widthMm,
        lengthMm: piece.lengthMm,
        areaMm2: piece.widthMm * piece.lengthMm,
      });
    }
  }

  // Sort pieces by area descending, then max dimension descending (Best-Fit Decreasing)
  unplaced.sort((a, b) => {
    if (b.areaMm2 !== a.areaMm2) return b.areaMm2 - a.areaMm2;
    return Math.max(b.widthMm, b.lengthMm) - Math.max(a.widthMm, a.lengthMm);
  });

  const workingSheets: WorkingSheet[] = [];

  function createNewSheet(sheetOption: PlateSheetOption): WorkingSheet {
    const usableW = Math.max(0, sheetOption.widthMm - 2 * edgeTrimMm);
    const usableL = Math.max(0, sheetOption.lengthMm - 2 * edgeTrimMm);

    return {
      sheetId: `plate-sheet-${workingSheets.length + 1}`,
      formatLabel: sheetOption.label || `${sheetOption.widthMm} × ${sheetOption.lengthMm} mm`,
      sheetWidthMm: sheetOption.widthMm,
      sheetLengthMm: sheetOption.lengthMm,
      cuts: [],
      freeRects: [
        {
          x: edgeTrimMm,
          y: edgeTrimMm,
          w: usableW,
          l: usableL,
        },
      ],
    };
  }

  for (const item of unplaced) {
    let bestPlacement: {
      sheetIndex: number;
      freeIndex: number;
      placedW: number;
      placedL: number;
      rotated: boolean;
      wasteScore: number;
    } | null = null;

    // Search open sheets for best-fit free rectangle
    for (let sIdx = 0; sIdx < workingSheets.length; sIdx++) {
      const sheet = workingSheets[sIdx];
      for (let fIdx = 0; fIdx < sheet.freeRects.length; fIdx++) {
        const free = sheet.freeRects[fIdx];

        // 1. Normal orientation
        if (canFit(free, item.widthMm, item.lengthMm)) {
          const waste = free.w * free.l - item.widthMm * item.lengthMm;
          if (!bestPlacement || waste < bestPlacement.wasteScore) {
            bestPlacement = {
              sheetIndex: sIdx,
              freeIndex: fIdx,
              placedW: item.widthMm,
              placedL: item.lengthMm,
              rotated: false,
              wasteScore: waste,
            };
          }
        }

        // 2. Rotated 90° orientation
        if (allowRotation && canFit(free, item.lengthMm, item.widthMm)) {
          const waste = free.w * free.l - item.lengthMm * item.widthMm;
          if (!bestPlacement || waste < bestPlacement.wasteScore) {
            bestPlacement = {
              sheetIndex: sIdx,
              freeIndex: fIdx,
              placedW: item.lengthMm,
              placedL: item.widthMm,
              rotated: true,
              wasteScore: waste,
            };
          }
        }
      }
    }

    if (!bestPlacement) {
      // Find smallest master sheet format that can fit this piece
      const matchingSheet =
        availableSheets.find((s) => {
          const uW = s.widthMm - 2 * edgeTrimMm;
          const uL = s.lengthMm - 2 * edgeTrimMm;
          return (
            (item.widthMm <= uW && item.lengthMm <= uL) ||
            (allowRotation && item.lengthMm <= uW && item.widthMm <= uL)
          );
        }) ?? availableSheets[0];

      const newSheet = createNewSheet(matchingSheet);
      workingSheets.push(newSheet);

      const free = newSheet.freeRects[0];
      const rotate =
        allowRotation &&
        !(item.widthMm <= free.w && item.lengthMm <= free.l) &&
        item.lengthMm <= free.w &&
        item.widthMm <= free.l;

      bestPlacement = {
        sheetIndex: workingSheets.length - 1,
        freeIndex: 0,
        placedW: rotate ? item.lengthMm : item.widthMm,
        placedL: rotate ? item.widthMm : item.lengthMm,
        rotated: rotate,
        wasteScore: free.w * free.l - item.widthMm * item.lengthMm,
      };
    }

    // Place the cut
    const targetSheet = workingSheets[bestPlacement.sheetIndex];
    const targetFree = targetSheet.freeRects[bestPlacement.freeIndex];

    const cutX = targetFree.x;
    const cutY = targetFree.y;
    const cutW = bestPlacement.placedW;
    const cutL = bestPlacement.placedL;

    targetSheet.cuts.push({
      pieceId: item.pieceId,
      label: item.label,
      cutIndex: targetSheet.cuts.length + 1,
      xMm: cutX,
      yMm: cutY,
      widthMm: cutW,
      lengthMm: cutL,
      rotated: bestPlacement.rotated,
    });

    // Remove used free rect and split remaining space (Guillotine / MaxRects split)
    targetSheet.freeRects.splice(bestPlacement.freeIndex, 1);

    const spaceRightW = targetFree.w - (cutW + kerfMm);
    const spaceRightL = cutL;

    const spaceTopW = targetFree.w;
    const spaceTopL = targetFree.l - (cutL + kerfMm);

    if (spaceRightW > 0 && spaceRightL > 0) {
      targetSheet.freeRects.push({
        x: cutX + cutW + kerfMm,
        y: cutY,
        w: spaceRightW,
        l: spaceRightL,
      });
    }

    if (spaceTopW > 0 && spaceTopL > 0) {
      targetSheet.freeRects.push({
        x: cutX,
        y: cutY + cutL + kerfMm,
        w: spaceTopW,
        l: spaceTopL,
      });
    }

    // Sort free rects by area ascending to favor tighter packing
    targetSheet.freeRects.sort((a, b) => a.w * a.l - b.w * b.l);
  }

  // Build patterns
  const patterns: PlatePattern[] = workingSheets.map((sheet, idx) => {
    const totalAreaM2 = (sheet.sheetWidthMm * sheet.sheetLengthMm) / 1_000_000;
    const usedAreaM2 = sheet.cuts.reduce((sum, c) => sum + (c.widthMm * c.lengthMm) / 1_000_000, 0);
    const scrapAreaM2 = Math.max(0, totalAreaM2 - usedAreaM2);
    const utilizationPercent = totalAreaM2 > 0 ? (usedAreaM2 / totalAreaM2) * 100 : 0;

    return {
      sheetId: `plate-sheet-${idx + 1}`,
      formatLabel: sheet.formatLabel,
      sheetWidthMm: sheet.sheetWidthMm,
      sheetLengthMm: sheet.sheetLengthMm,
      cuts: sheet.cuts,
      usedAreaM2: Number(usedAreaM2.toFixed(3)),
      totalAreaM2: Number(totalAreaM2.toFixed(3)),
      scrapAreaM2: Number(scrapAreaM2.toFixed(3)),
      utilizationPercent: Number(utilizationPercent.toFixed(2)),
    };
  });

  const totalMasterSheets = patterns.length;
  const totalMasterAreaM2 = Number(patterns.reduce((sum, p) => sum + p.totalAreaM2, 0).toFixed(3));
  const totalCutAreaM2 = Number(patterns.reduce((sum, p) => sum + p.usedAreaM2, 0).toFixed(3));
  const totalPiecesCount = patterns.reduce((sum, p) => sum + p.cuts.length, 0);
  const totalScrapAreaM2 = Number(Math.max(0, totalMasterAreaM2 - totalCutAreaM2).toFixed(3));

  const yieldPercent = totalMasterAreaM2 > 0 ? Number(((totalCutAreaM2 / totalMasterAreaAreaSafe(totalMasterAreaM2)) * 100).toFixed(2)) : 0;
  const scrapPercent = totalMasterAreaM2 > 0 ? Number(((totalScrapAreaM2 / totalMasterAreaAreaSafe(totalMasterAreaM2)) * 100).toFixed(2)) : 0;

  return {
    patterns,
    totalMasterSheets,
    totalMasterAreaM2,
    totalCutAreaM2,
    totalPiecesCount,
    totalScrapAreaM2,
    yieldPercent,
    scrapPercent,
    uncuttablePieces,
  };
}

function totalMasterAreaAreaSafe(n: number): number {
  return n > 0 ? n : 1;
}
