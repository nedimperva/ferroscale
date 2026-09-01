import type {
  CutOptimizationResult,
  CutOptimizerOptions,
  CutPattern,
  CutPiece,
  PlacedCut,
} from "./types";

const DEFAULT_STOCK_LENGTHS = [6000, 12000];
const DEFAULT_KERF_MM = 3;
const DEFAULT_MIN_REUSABLE_REMNANT_MM = 500;
const DEFAULT_TRIM_MM = 0;

interface UnplacedItem {
  pieceId: string;
  label?: string;
  lengthMm: number;
}

interface WorkingBar {
  barId: string;
  stockLengthMm: number;
  cuts: Array<{
    pieceId: string;
    label?: string;
    lengthMm: number;
  }>;
  trimMm: number;
  kerfMm: number;
}

function calculateBarOccupied(bar: WorkingBar): number {
  if (bar.cuts.length === 0) return 0;
  const cutsTotal = bar.cuts.reduce((sum, c) => sum + c.lengthMm, 0);
  const kerfTotal = (bar.cuts.length - 1) * bar.kerfMm;
  return bar.trimMm + cutsTotal + kerfTotal;
}

function remainingSpaceOnBar(bar: WorkingBar): number {
  return bar.stockLengthMm - calculateBarOccupied(bar);
}

function canFitOnBar(bar: WorkingBar, lengthMm: number, targetStockLengthMm = bar.stockLengthMm): boolean {
  if (bar.cuts.length === 0) {
    return bar.trimMm + lengthMm <= targetStockLengthMm;
  }
  return calculateBarOccupied(bar) + bar.kerfMm + lengthMm <= targetStockLengthMm;
}

function runBestFitPass(
  items: UnplacedItem[],
  availableStock: number[],
  kerfMm: number,
  trimMm: number,
  preferLargestStock: boolean,
): WorkingBar[] {
  const workingBars: WorkingBar[] = [];
  const maxStockLength = Math.max(...availableStock);

  for (const item of items) {
    let bestFitOption: {
      type: "existing" | "upgrade" | "new";
      barIndex?: number;
      targetStock?: number;
      leftover: number;
    } | null = null;

    // 1. Check existing bars at current stock length
    for (let b = 0; b < workingBars.length; b++) {
      const bar = workingBars[b];
      if (canFitOnBar(bar, item.lengthMm)) {
        const added = bar.cuts.length === 0 ? bar.trimMm + item.lengthMm : bar.kerfMm + item.lengthMm;
        const leftover = remainingSpaceOnBar(bar) - added;
        if (!bestFitOption || leftover < bestFitOption.leftover) {
          bestFitOption = { type: "existing", barIndex: b, leftover };
        }
      }
    }

    // 2. If no direct fit found, check if expanding an existing bar to a larger stock length works better than a new bar
    if (!bestFitOption) {
      for (let b = 0; b < workingBars.length; b++) {
        const bar = workingBars[b];
        const largerStocks = availableStock.filter((s) => s > bar.stockLengthMm);
        for (const s of largerStocks) {
          if (canFitOnBar(bar, item.lengthMm, s)) {
            const occ = calculateBarOccupied(bar);
            const added = bar.cuts.length === 0 ? bar.trimMm + item.lengthMm : bar.kerfMm + item.lengthMm;
            const leftover = s - (occ + added);
            if (!bestFitOption || leftover < bestFitOption.leftover) {
              bestFitOption = { type: "upgrade", barIndex: b, targetStock: s, leftover };
            }
          }
        }
      }
    }

    // 3. If still no fit (or opening a new bar), pick a stock length
    if (!bestFitOption) {
      const chosenStock = preferLargestStock
        ? (availableStock.slice().reverse().find((s) => trimMm + item.lengthMm <= s) ?? maxStockLength)
        : (availableStock.find((s) => trimMm + item.lengthMm <= s) ?? maxStockLength);

      const leftover = chosenStock - (trimMm + item.lengthMm);
      bestFitOption = { type: "new", targetStock: chosenStock, leftover };
    }

    // Apply decision
    if (bestFitOption.type === "existing" && bestFitOption.barIndex !== undefined) {
      workingBars[bestFitOption.barIndex].cuts.push({
        pieceId: item.pieceId,
        label: item.label,
        lengthMm: item.lengthMm,
      });
    } else if (
      bestFitOption.type === "upgrade" &&
      bestFitOption.barIndex !== undefined &&
      bestFitOption.targetStock !== undefined
    ) {
      const bar = workingBars[bestFitOption.barIndex];
      bar.stockLengthMm = bestFitOption.targetStock;
      bar.cuts.push({
        pieceId: item.pieceId,
        label: item.label,
        lengthMm: item.lengthMm,
      });
    } else {
      const newBar: WorkingBar = {
        barId: `bar-${workingBars.length + 1}`,
        stockLengthMm: bestFitOption.targetStock ?? maxStockLength,
        cuts: [
          {
            pieceId: item.pieceId,
            label: item.label,
            lengthMm: item.lengthMm,
          },
        ],
        trimMm,
        kerfMm,
      };
      workingBars.push(newBar);
    }
  }

  // Downsize pass: if a bar's items fit on a smaller standard stock, downsize it
  for (const bar of workingBars) {
    const needed = calculateBarOccupied(bar);
    const smallerStock = availableStock.find((s) => s < bar.stockLengthMm && needed <= s);
    if (smallerStock) {
      bar.stockLengthMm = smallerStock;
    }
  }

  return workingBars;
}

/**
 * Optimizes 1D cutting stock (linear nesting) for steel profiles.
 * Given a list of required pieces, standard stock bar sizes, and blade kerf,
 * computes an optimal cutting schedule that minimizes stock bars and scrap.
 */
export function optimizeCutList(
  pieces: CutPiece[],
  options: CutOptimizerOptions = {},
): CutOptimizationResult {
  const stockLengths = (
    options.stockLengthsMm && options.stockLengthsMm.length > 0
      ? [...options.stockLengthsMm]
      : DEFAULT_STOCK_LENGTHS
  )
    .filter((len) => Number.isFinite(len) && len > 0)
    .sort((a, b) => a - b);

  const availableStock = stockLengths.length > 0 ? stockLengths : DEFAULT_STOCK_LENGTHS;
  const maxStockLength = Math.max(...availableStock);
  const kerfMm = Math.max(0, options.kerfMm ?? DEFAULT_KERF_MM);
  const minReusableRemnantMm = Math.max(0, options.minReusableRemnantMm ?? DEFAULT_MIN_REUSABLE_REMNANT_MM);
  const trimMm = Math.max(0, options.trimMm ?? DEFAULT_TRIM_MM);

  const unplaced: UnplacedItem[] = [];
  const uncuttablePieces: CutPiece[] = [];

  // Expand quantities and classify cuttable vs oversized items
  for (const piece of pieces) {
    if (!Number.isFinite(piece.lengthMm) || piece.lengthMm <= 0 || piece.quantity <= 0) {
      continue;
    }
    if (piece.lengthMm + trimMm > maxStockLength) {
      uncuttablePieces.push(piece);
      continue;
    }
    const count = Math.floor(piece.quantity);
    for (let i = 0; i < count; i++) {
      unplaced.push({
        pieceId: piece.id,
        label: piece.label,
        lengthMm: piece.lengthMm,
      });
    }
  }

  // Sort pieces in descending order (Best-Fit Decreasing)
  unplaced.sort((a, b) => b.lengthMm - a.lengthMm);

  if (unplaced.length === 0) {
    return {
      patterns: [],
      totalStockBars: 0,
      totalStockLengthMm: 0,
      totalCutLengthMm: 0,
      totalPiecesCount: 0,
      totalKerfLossMm: 0,
      totalRemnantMm: 0,
      totalScrapMm: 0,
      totalReusableMm: 0,
      yieldPercent: 0,
      scrapPercent: 0,
      uncuttablePieces,
    };
  }

  // Multi-pass comparison: try both standard Best-Fit and Largest-Stock-First Best-Fit, pick the one with fewer bars / lower total stock length
  const pass1 = runBestFitPass(unplaced, availableStock, kerfMm, trimMm, false);
  const pass2 = runBestFitPass(unplaced, availableStock, kerfMm, trimMm, true);

  const score1 = {
    bars: pass1.length,
    totalLength: pass1.reduce((sum, b) => sum + b.stockLengthMm, 0),
  };
  const score2 = {
    bars: pass2.length,
    totalLength: pass2.reduce((sum, b) => sum + b.stockLengthMm, 0),
  };

  const bestWorkingBars =
    score2.bars < score1.bars || (score2.bars === score1.bars && score2.totalLength <= score1.totalLength)
      ? pass2
      : pass1;

  // Build final patterns
  const patterns: CutPattern[] = bestWorkingBars.map((bar, barIdx) => {
    let currentOffset = bar.trimMm;
    const placedCuts: PlacedCut[] = [];

    for (let cIdx = 0; cIdx < bar.cuts.length; cIdx++) {
      const cut = bar.cuts[cIdx];
      const startMm = currentOffset;
      const endMm = startMm + cut.lengthMm;
      placedCuts.push({
        pieceId: cut.pieceId,
        label: cut.label,
        lengthMm: cut.lengthMm,
        cutIndex: cIdx + 1,
        startMm,
        endMm,
      });
      currentOffset = endMm + bar.kerfMm;
    }

    const usedLengthMm = bar.cuts.reduce((sum, c) => sum + c.lengthMm, 0);
    const kerfLossMm = bar.cuts.length > 0 ? (bar.cuts.length - 1) * bar.kerfMm + bar.trimMm : 0;
    const remnantMm = Math.max(0, bar.stockLengthMm - usedLengthMm - kerfLossMm);
    const isReusable = remnantMm >= minReusableRemnantMm;
    const utilizationPercent = bar.stockLengthMm > 0 ? (usedLengthMm / bar.stockLengthMm) * 100 : 0;

    return {
      barId: `bar-${barIdx + 1}`,
      stockLengthMm: bar.stockLengthMm,
      cuts: placedCuts,
      usedLengthMm,
      kerfLossMm,
      remnantMm,
      isReusable,
      utilizationPercent: Number(utilizationPercent.toFixed(2)),
    };
  });

  const totalStockBars = patterns.length;
  const totalStockLengthMm = patterns.reduce((sum, p) => sum + p.stockLengthMm, 0);
  const totalCutLengthMm = patterns.reduce((sum, p) => sum + p.usedLengthMm, 0);
  const totalPiecesCount = patterns.reduce((sum, p) => sum + p.cuts.length, 0);
  const totalKerfLossMm = patterns.reduce((sum, p) => sum + p.kerfLossMm, 0);
  const totalRemnantMm = patterns.reduce((sum, p) => sum + p.remnantMm, 0);
  const totalReusableMm = patterns.filter((p) => p.isReusable).reduce((sum, p) => sum + p.remnantMm, 0);
  const totalScrapMm = patterns.filter((p) => !p.isReusable).reduce((sum, p) => sum + p.remnantMm, 0);

  const yieldPercent = totalStockLengthMm > 0 ? Number(((totalCutLengthMm / totalStockLengthMm) * 100).toFixed(2)) : 0;
  const scrapPercent = totalStockLengthMm > 0 ? Number(((totalScrapMm / totalStockLengthMm) * 100).toFixed(2)) : 0;

  return {
    patterns,
    totalStockBars,
    totalStockLengthMm,
    totalCutLengthMm,
    totalPiecesCount,
    totalKerfLossMm,
    totalRemnantMm,
    totalScrapMm,
    totalReusableMm,
    yieldPercent,
    scrapPercent,
    uncuttablePieces,
  };
}
