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
  w: number; // width along X (length axis)
  h: number; // height along Y (width axis)
}

interface WorkingSheet {
  sheetId: string;
  formatLabel: string;
  sheetWidthMm: number; // Y-axis
  sheetLengthMm: number; // X-axis
  cuts: PlacedPlateCut[];
  freeRects: FreeRect[];
}

function isContainedIn(a: FreeRect, b: FreeRect): boolean {
  return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
}

function pruneFreeList(freeRects: FreeRect[]): FreeRect[] {
  const result: FreeRect[] = [];
  for (let i = 0; i < freeRects.length; i++) {
    const a = freeRects[i];
    if (a.w <= 0 || a.h <= 0) continue;

    let isContained = false;
    for (let j = 0; j < freeRects.length; j++) {
      if (i !== j && isContainedIn(a, freeRects[j])) {
        isContained = true;
        break;
      }
    }
    if (!isContained) {
      result.push(a);
    }
  }
  return result;
}

function splitFreeRect(free: FreeRect, placedX: number, placedY: number, placedW: number, placedH: number): FreeRect[] {
  // Check if placed box overlaps with free rect
  if (
    placedX >= free.x + free.w ||
    placedX + placedW <= free.x ||
    placedY >= free.y + free.h ||
    placedY + placedH <= free.y
  ) {
    return [free];
  }

  const result: FreeRect[] = [];

  // Top sub-rectangle (above placed box)
  if (placedY + placedH < free.y + free.h && placedY + placedH > free.y) {
    result.push({
      x: free.x,
      y: placedY + placedH,
      w: free.w,
      h: free.y + free.h - (placedY + placedH),
    });
  }

  // Bottom sub-rectangle (below placed box)
  if (placedY > free.y && placedY < free.y + free.h) {
    result.push({
      x: free.x,
      y: free.y,
      w: free.w,
      h: placedY - free.y,
    });
  }

  // Right sub-rectangle (to the right of placed box)
  if (placedX + placedW < free.x + free.w && placedX + placedW > free.x) {
    result.push({
      x: placedX + placedW,
      y: free.y,
      w: free.x + free.w - (placedX + placedW),
      h: free.h,
    });
  }

  // Left sub-rectangle (to the left of placed box)
  if (placedX > free.x && placedX < free.x + free.w) {
    result.push({
      x: free.x,
      y: free.y,
      w: placedX - free.x,
      h: free.h,
    });
  }

  return result;
}

function createNewSheet(sheetOption: PlateSheetOption, edgeTrimMm: number, sheetCount: number): WorkingSheet {
  const lengthMm = Math.max(sheetOption.lengthMm, sheetOption.widthMm);
  const widthMm = Math.min(sheetOption.lengthMm, sheetOption.widthMm);

  const usableL = Math.max(0, lengthMm - 2 * edgeTrimMm);
  const usableW = Math.max(0, widthMm - 2 * edgeTrimMm);

  return {
    sheetId: `plate-sheet-${sheetCount + 1}`,
    formatLabel: sheetOption.label || `${widthMm} × ${lengthMm} mm`,
    sheetWidthMm: widthMm,
    sheetLengthMm: lengthMm,
    cuts: [],
    freeRects: [
      {
        x: edgeTrimMm,
        y: edgeTrimMm,
        w: usableL,
        h: usableW,
      },
    ],
  };
}

function packItemsOnSheets(
  unplaced: UnplacedRect[],
  availableSheets: PlateSheetOption[],
  kerfMm: number,
  edgeTrimMm: number,
  allowRotation: boolean,
): WorkingSheet[] {
  const workingSheets: WorkingSheet[] = [];

  for (const item of unplaced) {
    let bestPlacement: {
      sheetIndex: number;
      bestX: number;
      bestY: number;
      bestDx: number;
      bestDy: number;
      rotated: boolean;
      shortSideFit: number;
      areaFit: number;
    } | null = null;

    const dim1 = { dx: item.lengthMm, dy: item.widthMm, rotated: false };
    const dim2 = { dx: item.widthMm, dy: item.lengthMm, rotated: true };
    const orientations = allowRotation ? [dim1, dim2] : [dim1];

    // Search existing open sheets using MaxRects Best-Short-Side-Fit heuristic
    for (let sIdx = 0; sIdx < workingSheets.length; sIdx++) {
      const sheet = workingSheets[sIdx];
      for (const free of sheet.freeRects) {
        for (const orient of orientations) {
          if (orient.dx <= free.w && orient.dy <= free.h) {
            const shortSideFit = Math.min(free.w - orient.dx, free.h - orient.dy);
            const areaFit = free.w * free.h - orient.dx * orient.dy;

            let isBetter = false;
            if (!bestPlacement) {
              isBetter = true;
            } else if (shortSideFit < bestPlacement.shortSideFit) {
              isBetter = true;
            } else if (shortSideFit === bestPlacement.shortSideFit) {
              if (areaFit < bestPlacement.areaFit) {
                isBetter = true;
              } else if (areaFit === bestPlacement.areaFit) {
                // Bottom-Left tie breaker (favor lowest Y, then lowest X)
                if (free.y < bestPlacement.bestY || (free.y === bestPlacement.bestY && free.x < bestPlacement.bestX)) {
                  isBetter = true;
                }
              }
            }

            if (isBetter) {
              bestPlacement = {
                sheetIndex: sIdx,
                bestX: free.x,
                bestY: free.y,
                bestDx: orient.dx,
                bestDy: orient.dy,
                rotated: orient.rotated,
                shortSideFit,
                areaFit,
              };
            }
          }
        }
      }
    }

    // If item could not fit on any open sheet, open a new master sheet
    if (!bestPlacement) {
      const matchingSheet =
        availableSheets.find((s) => {
          const l = Math.max(s.lengthMm, s.widthMm) - 2 * edgeTrimMm;
          const w = Math.min(s.lengthMm, s.widthMm) - 2 * edgeTrimMm;
          return (
            (dim1.dx <= l && dim1.dy <= w) ||
            (allowRotation && dim2.dx <= l && dim2.dy <= w)
          );
        }) ?? availableSheets[0];

      const newSheet = createNewSheet(matchingSheet, edgeTrimMm, workingSheets.length);
      workingSheets.push(newSheet);

      const free = newSheet.freeRects[0];
      let chosen = dim1;
      if (allowRotation) {
        const canFit1 = dim1.dx <= free.w && dim1.dy <= free.h;
        const canFit2 = dim2.dx <= free.w && dim2.dy <= free.h;
        if (!canFit1 && canFit2) {
          chosen = dim2;
        } else if (canFit1 && canFit2) {
          const score1 = Math.min(free.w - dim1.dx, free.h - dim1.dy);
          const score2 = Math.min(free.w - dim2.dx, free.h - dim2.dy);
          chosen = score1 <= score2 ? dim1 : dim2;
        }
      }

      bestPlacement = {
        sheetIndex: workingSheets.length - 1,
        bestX: free.x,
        bestY: free.y,
        bestDx: chosen.dx,
        bestDy: chosen.dy,
        rotated: chosen.rotated,
        shortSideFit: Math.min(free.w - chosen.dx, free.h - chosen.dy),
        areaFit: free.w * free.h - chosen.dx * chosen.dy,
      };
    }

    // Place the cut
    const targetSheet = workingSheets[bestPlacement.sheetIndex];
    const cutX = bestPlacement.bestX;
    const cutY = bestPlacement.bestY;
    const cutDx = bestPlacement.bestDx;
    const cutDy = bestPlacement.bestDy;

    targetSheet.cuts.push({
      pieceId: item.pieceId,
      label: item.label,
      cutIndex: targetSheet.cuts.length + 1,
      xMm: cutX,
      yMm: cutY,
      dxMm: cutDx,
      dyMm: cutDy,
      widthMm: item.widthMm,
      lengthMm: item.lengthMm,
      rotated: bestPlacement.rotated,
    });

    // MaxRects split: split all overlapping free rectangles in this sheet
    const occupiedBox = {
      x: cutX,
      y: cutY,
      w: cutDx + kerfMm,
      h: cutDy + kerfMm,
    };

    const nextFreeList: FreeRect[] = [];
    for (const free of targetSheet.freeRects) {
      const splits = splitFreeRect(free, occupiedBox.x, occupiedBox.y, occupiedBox.w, occupiedBox.h);
      nextFreeList.push(...splits);
    }

    targetSheet.freeRects = pruneFreeList(nextFreeList);
  }

  return workingSheets;
}

function buildOptimizationResult(
  workingSheets: WorkingSheet[],
  uncuttablePieces: PlatePiece[],
): PlateOptimizationResult {
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

  const yieldPercent = totalMasterAreaM2 > 0 ? Number(((totalCutAreaM2 / totalMasterAreaM2) * 100).toFixed(2)) : 0;
  const scrapPercent = totalMasterAreaM2 > 0 ? Number(((totalScrapAreaM2 / totalMasterAreaM2) * 100).toFixed(2)) : 0;

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

/**
 * Optimizes 2D rectangular plate and sheet cutting nesting using Maximal Rectangles (MaxRects).
 * Evaluates candidate standard European master sheet formats to automatically select the format
 * or combination that minimizes total purchased raw sheet area and scrap loss.
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

  const maxSheetL = Math.max(...availableSheets.map((s) => Math.max(s.lengthMm, s.widthMm)));
  const maxSheetW = Math.max(...availableSheets.map((s) => Math.min(s.lengthMm, s.widthMm)));
  const usableMaxL = maxSheetL - 2 * edgeTrimMm;
  const usableMaxW = maxSheetW - 2 * edgeTrimMm;

  const unplaced: UnplacedRect[] = [];
  const uncuttablePieces: PlatePiece[] = [];

  // Expand quantities and validate dimensions
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

    const maxDim = Math.max(piece.widthMm, piece.lengthMm);
    const minDim = Math.min(piece.widthMm, piece.lengthMm);

    if (maxDim > usableMaxL || minDim > usableMaxW) {
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

  // Sort pieces by Area descending, then longer side descending (Best-Fit Decreasing)
  unplaced.sort((a, b) => {
    if (b.areaMm2 !== a.areaMm2) return b.areaMm2 - a.areaMm2;
    return Math.max(b.widthMm, b.lengthMm) - Math.max(a.widthMm, a.lengthMm);
  });

  if (unplaced.length === 0) {
    return buildOptimizationResult([], uncuttablePieces);
  }

  // If a single format was explicitly requested, pack on that format
  if (availableSheets.length === 1) {
    const workingSheets = packItemsOnSheets(unplaced, availableSheets, kerfMm, edgeTrimMm, allowRotation);
    return buildOptimizationResult(workingSheets, uncuttablePieces);
  }

  // Multi-format evaluation (Procurement / Auto mode):
  // 1. Try each uniform standard format (1000×2000, 1250×2500, 1500×3000, 2000×4000, 2000×6000)
  // 2. Compare total master sheet area consumed to pick the global minimum waste format
  const candidateResults: PlateOptimizationResult[] = [];

  for (const fmt of availableSheets) {
    const l = Math.max(fmt.lengthMm, fmt.widthMm) - 2 * edgeTrimMm;
    const w = Math.min(fmt.lengthMm, fmt.widthMm) - 2 * edgeTrimMm;

    // Check if every piece can fit into this format
    const canAllFit = unplaced.every((p) => {
      const maxDim = Math.max(p.lengthMm, p.widthMm);
      const minDim = Math.min(p.lengthMm, p.widthMm);
      return (p.lengthMm <= l && p.widthMm <= w) || (allowRotation && maxDim <= l && minDim <= w);
    });

    if (canAllFit) {
      const sheets = packItemsOnSheets(unplaced, [fmt], kerfMm, edgeTrimMm, allowRotation);
      candidateResults.push(buildOptimizationResult(sheets, uncuttablePieces));
    }
  }

  // Also try adaptive mixed format packing
  const mixedSheets = packItemsOnSheets(unplaced, availableSheets, kerfMm, edgeTrimMm, allowRotation);
  candidateResults.push(buildOptimizationResult(mixedSheets, uncuttablePieces));

  // Pick the winner:
  // Primary goal: MINIMUM totalMasterAreaM2 (least raw square meters purchased / lowest cost!)
  // Secondary: HIGHEST yieldPercent, then FEWEST master sheets
  candidateResults.sort((a, b) => {
    if (Math.abs(a.totalMasterAreaM2 - b.totalMasterAreaM2) > 0.05) {
      return a.totalMasterAreaM2 - b.totalMasterAreaM2;
    }
    if (Math.abs(b.yieldPercent - a.yieldPercent) > 0.5) {
      return b.yieldPercent - a.yieldPercent;
    }
    return a.totalMasterSheets - b.totalMasterSheets;
  });

  return candidateResults[0] ?? buildOptimizationResult(mixedSheets, uncuttablePieces);
}
