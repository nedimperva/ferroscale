/**
 * Types and interfaces for 1D cutting stock (linear nesting) optimization.
 */

export interface CutPiece {
  /** Unique ID of the piece or calculation row. */
  id: string;
  /** Human-readable label (e.g. "Main column", "Brace A"). */
  label?: string;
  /** Cut length in millimetres. */
  lengthMm: number;
  /** Quantity of pieces required. */
  quantity: number;
}

export interface CutStockOption {
  /** Standard stock bar length in millimetres (e.g. 6000, 12000). */
  stockLengthMm: number;
  /** Optional unit price or cost per bar. */
  cost?: number;
}

export interface PlacedCut {
  pieceId: string;
  label?: string;
  lengthMm: number;
  cutIndex: number;
  /** Position from the start of the stock bar (0-indexed, mm). */
  startMm: number;
  /** Position where this cut ends on the bar (mm). */
  endMm: number;
}

export interface CutPattern {
  /** Unique ID for this cut bar instance. */
  barId: string;
  /** Stock bar length used in millimetres. */
  stockLengthMm: number;
  /** Ordered list of cuts placed along this bar. */
  cuts: PlacedCut[];
  /** Total useful length of pieces cut from this bar (mm). */
  usedLengthMm: number;
  /** Total kerf lost on this bar (mm). */
  kerfLossMm: number;
  /** Remaining unused length at the end of the bar (mm). */
  remnantMm: number;
  /** Whether the remnant is large enough to be reusable inventory (vs scrap). */
  isReusable: boolean;
  /** Material utilization efficiency (0-100%). */
  utilizationPercent: number;
}

export interface CutOptimizerOptions {
  /** Available standard stock lengths (defaults to [6000, 12000]). */
  stockLengthsMm?: number[];
  /** Saw blade kerf loss per cut in millimetres (defaults to 3mm). */
  kerfMm?: number;
  /** Minimum length for a remnant to be deemed reusable (defaults to 500mm). */
  minReusableRemnantMm?: number;
  /** Optional lead trim removed from the bar before cutting (defaults to 0mm). */
  trimMm?: number;
}

export interface CutOptimizationResult {
  /** Optimized bar cutting layouts. */
  patterns: CutPattern[];
  /** Total number of stock bars required. */
  totalStockBars: number;
  /** Total raw length of stock bars purchased/consumed (mm). */
  totalStockLengthMm: number;
  /** Total useful cut length required (mm). */
  totalCutLengthMm: number;
  /** Total count of pieces successfully nested. */
  totalPiecesCount: number;
  /** Total kerf loss across all bars (mm). */
  totalKerfLossMm: number;
  /** Total unused remnant length across all bars (mm). */
  totalRemnantMm: number;
  /** Total scrap length (remnants < minReusableRemnantMm) in mm. */
  totalScrapMm: number;
  /** Total reusable offcut length (remnants >= minReusableRemnantMm) in mm. */
  totalReusableMm: number;
  /** Overall material yield percentage (0-100%). */
  yieldPercent: number;
  /** Total scrap percentage (0-100%). */
  scrapPercent: number;
  /** Pieces that could not be cut because their length exceeds the largest stock bar. */
  uncuttablePieces: CutPiece[];
}
