import type { CalculationInput, UnitValue } from "@/lib/calculator/types";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";

/**
 * Formula-QA reference rows. `expectedKgPerM` values are INDEPENDENT of the
 * engine and the datasets:
 *   · standard profiles — published EN / producer-catalog masses (kg/m)
 *   · manual profiles — hand-computed cross-section formulas × S235JR density
 *     (7850 kg/m³), e.g. round bar Ø40 → π/4 · 40² mm² · 7850e-9 = 9.8646 kg/m
 * Do NOT regenerate these from the app: their whole value is being an outside
 * oracle. If a row fails, either the dataset drifted or the reference needs a
 * documented correction.
 */

export interface QaBenchmarkRow {
  id: string;
  /** Human label, e.g. "HEA 200" or "Round bar Ø40". */
  label: string;
  profileId: ProfileId;
  selectedSizeId?: string;
  manualDimensionsMm?: Partial<Record<DimensionKey, number>>;
  /** Independent reference weight per metre for S235JR. */
  expectedKgPerM: number;
  /** Where the reference number comes from. */
  source: string;
}

/** Matches the engine benchmark tolerance. */
export const QA_TOLERANCE_PCT = 0.5;

export const QA_BENCHMARK_ROWS: QaBenchmarkRow[] = [
  /* ---- Standard profiles: published catalog masses ---- */
  { id: "ipe160", label: "IPE 160", profileId: "beam_ipe_en", selectedSizeId: "ipe160", expectedKgPerM: 15.8, source: "EN 10365 catalog" },
  { id: "ipn200", label: "IPN 200", profileId: "beam_ipn_en", selectedSizeId: "ipn200", expectedKgPerM: 26.2, source: "EN 10024 catalog" },
  { id: "hea200", label: "HEA 200", profileId: "beam_hea_en", selectedSizeId: "hea200", expectedKgPerM: 42.3, source: "EN 10365 catalog" },
  { id: "heb200", label: "HEB 200", profileId: "beam_heb_en", selectedSizeId: "heb200", expectedKgPerM: 61.3, source: "EN 10365 catalog" },
  { id: "hem200", label: "HEM 200", profileId: "beam_hem_en", selectedSizeId: "hem200", expectedKgPerM: 103.0, source: "EN 10365 catalog" },
  { id: "upn120", label: "UPN 120", profileId: "channel_upn_en", selectedSizeId: "upn120", expectedKgPerM: 13.4, source: "EN 10365 catalog" },
  { id: "upe200", label: "UPE 200", profileId: "channel_upe_en", selectedSizeId: "upe200", expectedKgPerM: 22.8, source: "EN 10279 catalog" },
  { id: "t60x7", label: "T 60×60×7", profileId: "tee_en", selectedSizeId: "t60x7", expectedKgPerM: 6.23, source: "EN 10055 catalog" },

  /* ---- Manual profiles: hand-computed formula × 7850 kg/m³ ---- */
  { id: "round_bar", label: "Round bar Ø40", profileId: "round_bar", manualDimensionsMm: { diameter: 40 }, expectedKgPerM: 9.8646, source: "π/4·40² × ρ" },
  { id: "square_bar", label: "Square bar 35", profileId: "square_bar", manualDimensionsMm: { side: 35 }, expectedKgPerM: 9.6162, source: "35² × ρ" },
  { id: "flat_bar", label: "Flat 120×10", profileId: "flat_bar", manualDimensionsMm: { width: 120, thickness: 10 }, expectedKgPerM: 9.42, source: "120·10 × ρ" },
  { id: "angle", label: "Angle 80×80×8", profileId: "angle", manualDimensionsMm: { legA: 80, legB: 80, thickness: 8 }, expectedKgPerM: 9.5456, source: "(80+80−8)·8 × ρ" },
  { id: "pipe", label: "Pipe 88.9×5", profileId: "pipe", manualDimensionsMm: { outerDiameter: 88.9, wallThickness: 5 }, expectedKgPerM: 10.3455, source: "π/4·(88.9²−78.9²) × ρ" },
  { id: "rect_tube", label: "RHS 120×80×4", profileId: "rectangular_tube", manualDimensionsMm: { width: 120, height: 80, wallThickness: 4 }, expectedKgPerM: 12.0576, source: "120·80−112·72 × ρ" },
  { id: "shs", label: "SHS 100×5", profileId: "square_hollow", manualDimensionsMm: { side: 100, wallThickness: 5 }, expectedKgPerM: 14.915, source: "100²−90² × ρ" },
  { id: "sheet", label: "Sheet 1250×2.5", profileId: "sheet", manualDimensionsMm: { width: 1250, thickness: 2.5 }, expectedKgPerM: 24.5312, source: "1250·2.5 × ρ" },
  { id: "plate", label: "Plate 1500×16", profileId: "plate", manualDimensionsMm: { width: 1500, thickness: 16 }, expectedKgPerM: 188.4, source: "1500·16 × ρ" },
  { id: "chequered", label: "Chequered 1500×5+2", profileId: "chequered_plate", manualDimensionsMm: { width: 1500, thickness: 5, patternHeight: 2 }, expectedKgPerM: 70.65, source: "1500·(5+2·0.5) × ρ" },
  { id: "expanded", label: "Expanded 1250×3", profileId: "expanded_metal", manualDimensionsMm: { width: 1250, thickness: 3 }, expectedKgPerM: 29.4375, source: "1250·3 × ρ" },
  { id: "corrugated", label: "Corrugated 1000×0.7", profileId: "corrugated_sheet", manualDimensionsMm: { width: 1000, thickness: 0.7 }, expectedKgPerM: 5.495, source: "1000·0.7 × ρ" },
];

export function benchmarkRowToInput(row: QaBenchmarkRow): CalculationInput {
  const manualDimensions: Partial<Record<DimensionKey, UnitValue>> = {};
  for (const key of Object.keys(row.manualDimensionsMm ?? {}) as DimensionKey[]) {
    manualDimensions[key] = { value: row.manualDimensionsMm![key]!, unit: "mm" };
  }
  return {
    materialGradeId: "steel-s235jr",
    useCustomDensity: false,
    profileId: row.profileId,
    selectedSizeId: row.selectedSizeId,
    manualDimensions,
    length: { value: 1000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 0,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: { weightDecimals: 8, priceDecimals: 2, dimensionDecimals: 4 },
  };
}
