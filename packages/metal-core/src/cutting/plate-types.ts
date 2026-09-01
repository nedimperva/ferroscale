/**
 * Types and interfaces for 2D rectangular plate and sheet cutting (nesting) optimization.
 */

export interface PlatePiece {
  /** Unique ID of the piece or calculation row. */
  id: string;
  /** Human-readable label (e.g. "Base plate 1", "Gusset A"). */
  label?: string;
  /** Width in millimetres. */
  widthMm: number;
  /** Length in millimetres. */
  lengthMm: number;
  /** Thickness in millimetres (for information & grouping). */
  thicknessMm?: number;
  /** Quantity of pieces required. */
  quantity: number;
}

export interface PlateSheetOption {
  /** Format label (e.g. "Kleinformat (1000×2000)"). */
  label: string;
  /** Width in millimetres (shorter edge, Y-axis). */
  widthMm: number;
  /** Length in millimetres (longer edge, X-axis). */
  lengthMm: number;
  /** Optional unit cost per master sheet. */
  cost?: number;
}

export interface PlacedPlateCut {
  pieceId: string;
  label?: string;
  cutIndex: number;
  /** X-coordinate from left edge of master sheet (mm). */
  xMm: number;
  /** Y-coordinate from bottom/top edge of master sheet (mm). */
  yMm: number;
  /** Placed dimension along sheet horizontal X axis (mm). */
  dxMm: number;
  /** Placed dimension along sheet vertical Y axis (mm). */
  dyMm: number;
  /** Original piece width (mm). */
  widthMm: number;
  /** Original piece length (mm). */
  lengthMm: number;
  /** Whether the piece was rotated 90 degrees on the sheet. */
  rotated: boolean;
}

export interface PlatePattern {
  /** Unique ID for this master sheet instance. */
  sheetId: string;
  /** Master sheet format label (e.g. "1500 × 3000 mm"). */
  formatLabel: string;
  /** Master sheet width in millimetres (Y-axis). */
  sheetWidthMm: number;
  /** Master sheet length in millimetres (X-axis). */
  sheetLengthMm: number;
  /** Ordered list of rectangular cuts placed on this sheet. */
  cuts: PlacedPlateCut[];
  /** Total useful cut area on this sheet (m²). */
  usedAreaM2: number;
  /** Total area of this master sheet (m²). */
  totalAreaM2: number;
  /** Unused / scrap area on this sheet (m²). */
  scrapAreaM2: number;
  /** Area utilization percentage (0-100%). */
  utilizationPercent: number;
}

export interface PlateOptimizerOptions {
  /** Available standard sheet formats to choose from. */
  standardSheets?: PlateSheetOption[];
  /** Kerf / cutting blade or laser/plasma separation gap between parts (mm). Defaults to 3mm. */
  kerfMm?: number;
  /** Edge margin trim around master sheet perimeter (mm). Defaults to 10mm. */
  edgeTrimMm?: number;
  /** Whether pieces may be rotated 90° for optimal packing (defaults to true). */
  allowRotation?: boolean;
}

export interface PlateOptimizationResult {
  /** Optimized master plate layout patterns. */
  patterns: PlatePattern[];
  /** Total number of master plates required. */
  totalMasterSheets: number;
  /** Total master plate area purchased/consumed (m²). */
  totalMasterAreaM2: number;
  /** Total useful cut part area required (m²). */
  totalCutAreaM2: number;
  /** Total count of pieces successfully nested. */
  totalPiecesCount: number;
  /** Total scrap area (m²). */
  totalScrapAreaM2: number;
  /** Overall area yield efficiency percentage (0-100%). */
  yieldPercent: number;
  /** Total scrap percentage (0-100%). */
  scrapPercent: number;
  /** Pieces that could not fit onto any available master sheet format. */
  uncuttablePieces: PlatePiece[];
}

/** Standard European sheet and plate formats per EN 10029 / EN 10051. */
export const STANDARD_EURO_SHEET_FORMATS: PlateSheetOption[] = [
  { label: "1000 × 2000 mm (Small / Kleinformat)", widthMm: 1000, lengthMm: 2000 },
  { label: "1250 × 2500 mm (Medium / Mittelformat)", widthMm: 1250, lengthMm: 2500 },
  { label: "1500 × 3000 mm (Large / Großformat)", widthMm: 1500, lengthMm: 3000 },
  { label: "2000 × 4000 mm (Maxi / Superformat)", widthMm: 2000, lengthMm: 4000 },
  { label: "2000 × 6000 mm (Superformat)", widthMm: 2000, lengthMm: 6000 },
];
