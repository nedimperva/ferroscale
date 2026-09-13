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
 *
 * These rows are also the ONLY independent check the engine benchmark in
 * `engine.test.ts` has for standard profiles, so coverage here is coverage
 * there. Adding a standard size to a dataset means adding its published mass
 * here in the same change.
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

/**
 * EN sizes deliberately excluded from the gate: the stored area and the
 * published catalog mass disagree by more than the tolerance and which of the
 * two is wrong has not been settled against a primary catalog. They are exempt
 * from the check, not from the fix - resolve each against an EN table, correct
 * whichever side is wrong, and move it into QA_BENCHMARK_ROWS.
 *
 * Deviation of stored area vs catalog mass at the time of writing:
 *   IPN 80 3.87% - IPN 120 0.56% - IPN 320 0.72%
 *   HEM 140 1.04% - HEM 260 0.60%
 *   T 30x30x4 1.12% - T 40x40x5 0.55%
 */
export const QA_UNVERIFIED_SIZES: string[] = [
  "beam_ipn_en/ipn80",
  "beam_ipn_en/ipn120",
  "beam_ipn_en/ipn320",
  "beam_hem_en/hem140",
  "beam_hem_en/hem260",
  "tee_en/t30x4",
  "tee_en/t40x5",
];

export const QA_BENCHMARK_ROWS: QaBenchmarkRow[] = [
  /* ------------------------------------------------------------------ */
  /*  Standard profiles - published catalog masses                       */
  /*                                                                     */
  /*  Every EN size whose catalog mass corroborates the stored area.     */
  /*  Seven sizes are deliberately ABSENT because catalog mass and the   */
  /*  stored area disagree by more than the tolerance, and which of the  */
  /*  two is wrong has not been settled against a primary catalog:       */
  /*    IPN 80 (3.87%), IPN 120 (0.56%), IPN 320 (0.72%),                */
  /*    HEM 140 (1.04%), HEM 260 (0.60%),                                */
  /*    T 30x30x4 (1.12%), T 40x40x5 (0.55%)                             */
  /*  Resolve those against an EN table and add them here; do not        */
  /*  silence them by copying the app's own output.                      */
  /* ------------------------------------------------------------------ */
  /* ---- IPE (EN 10365) ---- */
  { id: "ipe80", label: "IPE 80", profileId: "beam_ipe_en", selectedSizeId: "ipe80", expectedKgPerM: 6, source: "EN 10365 catalog" },
  { id: "ipe100", label: "IPE 100", profileId: "beam_ipe_en", selectedSizeId: "ipe100", expectedKgPerM: 8.1, source: "EN 10365 catalog" },
  { id: "ipe120", label: "IPE 120", profileId: "beam_ipe_en", selectedSizeId: "ipe120", expectedKgPerM: 10.4, source: "EN 10365 catalog" },
  { id: "ipe140", label: "IPE 140", profileId: "beam_ipe_en", selectedSizeId: "ipe140", expectedKgPerM: 12.9, source: "EN 10365 catalog" },
  { id: "ipe160", label: "IPE 160", profileId: "beam_ipe_en", selectedSizeId: "ipe160", expectedKgPerM: 15.8, source: "EN 10365 catalog" },
  { id: "ipe180", label: "IPE 180", profileId: "beam_ipe_en", selectedSizeId: "ipe180", expectedKgPerM: 18.8, source: "EN 10365 catalog" },
  { id: "ipe200", label: "IPE 200", profileId: "beam_ipe_en", selectedSizeId: "ipe200", expectedKgPerM: 22.4, source: "EN 10365 catalog" },
  { id: "ipe220", label: "IPE 220", profileId: "beam_ipe_en", selectedSizeId: "ipe220", expectedKgPerM: 26.2, source: "EN 10365 catalog" },
  { id: "ipe240", label: "IPE 240", profileId: "beam_ipe_en", selectedSizeId: "ipe240", expectedKgPerM: 30.7, source: "EN 10365 catalog" },
  { id: "ipe270", label: "IPE 270", profileId: "beam_ipe_en", selectedSizeId: "ipe270", expectedKgPerM: 36.1, source: "EN 10365 catalog" },
  { id: "ipe300", label: "IPE 300", profileId: "beam_ipe_en", selectedSizeId: "ipe300", expectedKgPerM: 42.2, source: "EN 10365 catalog" },
  { id: "ipe330", label: "IPE 330", profileId: "beam_ipe_en", selectedSizeId: "ipe330", expectedKgPerM: 49.1, source: "EN 10365 catalog" },
  { id: "ipe360", label: "IPE 360", profileId: "beam_ipe_en", selectedSizeId: "ipe360", expectedKgPerM: 57.1, source: "EN 10365 catalog" },
  { id: "ipe400", label: "IPE 400", profileId: "beam_ipe_en", selectedSizeId: "ipe400", expectedKgPerM: 66.3, source: "EN 10365 catalog" },
  { id: "ipe450", label: "IPE 450", profileId: "beam_ipe_en", selectedSizeId: "ipe450", expectedKgPerM: 77.6, source: "EN 10365 catalog" },
  { id: "ipe500", label: "IPE 500", profileId: "beam_ipe_en", selectedSizeId: "ipe500", expectedKgPerM: 90.7, source: "EN 10365 catalog" },
  { id: "ipe550", label: "IPE 550", profileId: "beam_ipe_en", selectedSizeId: "ipe550", expectedKgPerM: 106, source: "EN 10365 catalog" },
  { id: "ipe600", label: "IPE 600", profileId: "beam_ipe_en", selectedSizeId: "ipe600", expectedKgPerM: 122, source: "EN 10365 catalog" },

  /* ---- IPN (EN 10024) ---- */
  { id: "ipn100", label: "IPN 100", profileId: "beam_ipn_en", selectedSizeId: "ipn100", expectedKgPerM: 8.34, source: "EN 10024 catalog" },
  { id: "ipn140", label: "IPN 140", profileId: "beam_ipn_en", selectedSizeId: "ipn140", expectedKgPerM: 14.3, source: "EN 10024 catalog" },
  { id: "ipn160", label: "IPN 160", profileId: "beam_ipn_en", selectedSizeId: "ipn160", expectedKgPerM: 17.9, source: "EN 10024 catalog" },
  { id: "ipn180", label: "IPN 180", profileId: "beam_ipn_en", selectedSizeId: "ipn180", expectedKgPerM: 21.9, source: "EN 10024 catalog" },
  { id: "ipn200", label: "IPN 200", profileId: "beam_ipn_en", selectedSizeId: "ipn200", expectedKgPerM: 26.2, source: "EN 10024 catalog" },
  { id: "ipn220", label: "IPN 220", profileId: "beam_ipn_en", selectedSizeId: "ipn220", expectedKgPerM: 31.1, source: "EN 10024 catalog" },
  { id: "ipn240", label: "IPN 240", profileId: "beam_ipn_en", selectedSizeId: "ipn240", expectedKgPerM: 36.2, source: "EN 10024 catalog" },
  { id: "ipn260", label: "IPN 260", profileId: "beam_ipn_en", selectedSizeId: "ipn260", expectedKgPerM: 41.9, source: "EN 10024 catalog" },
  { id: "ipn280", label: "IPN 280", profileId: "beam_ipn_en", selectedSizeId: "ipn280", expectedKgPerM: 47.9, source: "EN 10024 catalog" },
  { id: "ipn300", label: "IPN 300", profileId: "beam_ipn_en", selectedSizeId: "ipn300", expectedKgPerM: 54.2, source: "EN 10024 catalog" },
  { id: "ipn340", label: "IPN 340", profileId: "beam_ipn_en", selectedSizeId: "ipn340", expectedKgPerM: 68, source: "EN 10024 catalog" },
  { id: "ipn360", label: "IPN 360", profileId: "beam_ipn_en", selectedSizeId: "ipn360", expectedKgPerM: 76.1, source: "EN 10024 catalog" },
  { id: "ipn380", label: "IPN 380", profileId: "beam_ipn_en", selectedSizeId: "ipn380", expectedKgPerM: 84, source: "EN 10024 catalog" },
  { id: "ipn400", label: "IPN 400", profileId: "beam_ipn_en", selectedSizeId: "ipn400", expectedKgPerM: 92.4, source: "EN 10024 catalog" },

  /* ---- HEA (EN 10365) ---- */
  { id: "hea100", label: "HEA 100", profileId: "beam_hea_en", selectedSizeId: "hea100", expectedKgPerM: 16.7, source: "EN 10365 catalog" },
  { id: "hea120", label: "HEA 120", profileId: "beam_hea_en", selectedSizeId: "hea120", expectedKgPerM: 19.9, source: "EN 10365 catalog" },
  { id: "hea140", label: "HEA 140", profileId: "beam_hea_en", selectedSizeId: "hea140", expectedKgPerM: 24.7, source: "EN 10365 catalog" },
  { id: "hea160", label: "HEA 160", profileId: "beam_hea_en", selectedSizeId: "hea160", expectedKgPerM: 30.4, source: "EN 10365 catalog" },
  { id: "hea180", label: "HEA 180", profileId: "beam_hea_en", selectedSizeId: "hea180", expectedKgPerM: 35.5, source: "EN 10365 catalog" },
  { id: "hea200", label: "HEA 200", profileId: "beam_hea_en", selectedSizeId: "hea200", expectedKgPerM: 42.3, source: "EN 10365 catalog" },
  { id: "hea220", label: "HEA 220", profileId: "beam_hea_en", selectedSizeId: "hea220", expectedKgPerM: 50.5, source: "EN 10365 catalog" },
  { id: "hea240", label: "HEA 240", profileId: "beam_hea_en", selectedSizeId: "hea240", expectedKgPerM: 60.3, source: "EN 10365 catalog" },
  { id: "hea260", label: "HEA 260", profileId: "beam_hea_en", selectedSizeId: "hea260", expectedKgPerM: 68.2, source: "EN 10365 catalog" },
  { id: "hea280", label: "HEA 280", profileId: "beam_hea_en", selectedSizeId: "hea280", expectedKgPerM: 76.4, source: "EN 10365 catalog" },
  { id: "hea300", label: "HEA 300", profileId: "beam_hea_en", selectedSizeId: "hea300", expectedKgPerM: 88.3, source: "EN 10365 catalog" },
  { id: "hea320", label: "HEA 320", profileId: "beam_hea_en", selectedSizeId: "hea320", expectedKgPerM: 97.6, source: "EN 10365 catalog" },
  { id: "hea340", label: "HEA 340", profileId: "beam_hea_en", selectedSizeId: "hea340", expectedKgPerM: 105, source: "EN 10365 catalog" },
  { id: "hea360", label: "HEA 360", profileId: "beam_hea_en", selectedSizeId: "hea360", expectedKgPerM: 112, source: "EN 10365 catalog" },
  { id: "hea400", label: "HEA 400", profileId: "beam_hea_en", selectedSizeId: "hea400", expectedKgPerM: 125, source: "EN 10365 catalog" },
  { id: "hea450", label: "HEA 450", profileId: "beam_hea_en", selectedSizeId: "hea450", expectedKgPerM: 140, source: "EN 10365 catalog" },
  { id: "hea500", label: "HEA 500", profileId: "beam_hea_en", selectedSizeId: "hea500", expectedKgPerM: 155, source: "EN 10365 catalog" },
  { id: "hea550", label: "HEA 550", profileId: "beam_hea_en", selectedSizeId: "hea550", expectedKgPerM: 166, source: "EN 10365 catalog" },
  { id: "hea600", label: "HEA 600", profileId: "beam_hea_en", selectedSizeId: "hea600", expectedKgPerM: 178, source: "EN 10365 catalog" },
  { id: "hea650", label: "HEA 650", profileId: "beam_hea_en", selectedSizeId: "hea650", expectedKgPerM: 190, source: "EN 10365 catalog" },
  { id: "hea700", label: "HEA 700", profileId: "beam_hea_en", selectedSizeId: "hea700", expectedKgPerM: 204, source: "EN 10365 catalog" },
  { id: "hea800", label: "HEA 800", profileId: "beam_hea_en", selectedSizeId: "hea800", expectedKgPerM: 224, source: "EN 10365 catalog" },
  { id: "hea900", label: "HEA 900", profileId: "beam_hea_en", selectedSizeId: "hea900", expectedKgPerM: 252, source: "EN 10365 catalog" },
  { id: "hea1000", label: "HEA 1000", profileId: "beam_hea_en", selectedSizeId: "hea1000", expectedKgPerM: 272, source: "EN 10365 catalog" },

  /* ---- HEB (EN 10365) ---- */
  { id: "heb100", label: "HEB 100", profileId: "beam_heb_en", selectedSizeId: "heb100", expectedKgPerM: 20.4, source: "EN 10365 catalog" },
  { id: "heb120", label: "HEB 120", profileId: "beam_heb_en", selectedSizeId: "heb120", expectedKgPerM: 26.7, source: "EN 10365 catalog" },
  { id: "heb140", label: "HEB 140", profileId: "beam_heb_en", selectedSizeId: "heb140", expectedKgPerM: 33.7, source: "EN 10365 catalog" },
  { id: "heb160", label: "HEB 160", profileId: "beam_heb_en", selectedSizeId: "heb160", expectedKgPerM: 42.6, source: "EN 10365 catalog" },
  { id: "heb180", label: "HEB 180", profileId: "beam_heb_en", selectedSizeId: "heb180", expectedKgPerM: 51.2, source: "EN 10365 catalog" },
  { id: "heb200", label: "HEB 200", profileId: "beam_heb_en", selectedSizeId: "heb200", expectedKgPerM: 61.3, source: "EN 10365 catalog" },
  { id: "heb220", label: "HEB 220", profileId: "beam_heb_en", selectedSizeId: "heb220", expectedKgPerM: 71.5, source: "EN 10365 catalog" },
  { id: "heb240", label: "HEB 240", profileId: "beam_heb_en", selectedSizeId: "heb240", expectedKgPerM: 83.2, source: "EN 10365 catalog" },
  { id: "heb260", label: "HEB 260", profileId: "beam_heb_en", selectedSizeId: "heb260", expectedKgPerM: 93, source: "EN 10365 catalog" },
  { id: "heb280", label: "HEB 280", profileId: "beam_heb_en", selectedSizeId: "heb280", expectedKgPerM: 103, source: "EN 10365 catalog" },
  { id: "heb300", label: "HEB 300", profileId: "beam_heb_en", selectedSizeId: "heb300", expectedKgPerM: 117, source: "EN 10365 catalog" },
  { id: "heb320", label: "HEB 320", profileId: "beam_heb_en", selectedSizeId: "heb320", expectedKgPerM: 127, source: "EN 10365 catalog" },
  { id: "heb340", label: "HEB 340", profileId: "beam_heb_en", selectedSizeId: "heb340", expectedKgPerM: 134, source: "EN 10365 catalog" },
  { id: "heb360", label: "HEB 360", profileId: "beam_heb_en", selectedSizeId: "heb360", expectedKgPerM: 142, source: "EN 10365 catalog" },
  { id: "heb400", label: "HEB 400", profileId: "beam_heb_en", selectedSizeId: "heb400", expectedKgPerM: 155, source: "EN 10365 catalog" },
  { id: "heb450", label: "HEB 450", profileId: "beam_heb_en", selectedSizeId: "heb450", expectedKgPerM: 171, source: "EN 10365 catalog" },
  { id: "heb500", label: "HEB 500", profileId: "beam_heb_en", selectedSizeId: "heb500", expectedKgPerM: 187, source: "EN 10365 catalog" },
  { id: "heb550", label: "HEB 550", profileId: "beam_heb_en", selectedSizeId: "heb550", expectedKgPerM: 199, source: "EN 10365 catalog" },
  { id: "heb600", label: "HEB 600", profileId: "beam_heb_en", selectedSizeId: "heb600", expectedKgPerM: 212, source: "EN 10365 catalog" },
  { id: "heb650", label: "HEB 650", profileId: "beam_heb_en", selectedSizeId: "heb650", expectedKgPerM: 225, source: "EN 10365 catalog" },
  { id: "heb700", label: "HEB 700", profileId: "beam_heb_en", selectedSizeId: "heb700", expectedKgPerM: 241, source: "EN 10365 catalog" },
  { id: "heb800", label: "HEB 800", profileId: "beam_heb_en", selectedSizeId: "heb800", expectedKgPerM: 262, source: "EN 10365 catalog" },
  { id: "heb900", label: "HEB 900", profileId: "beam_heb_en", selectedSizeId: "heb900", expectedKgPerM: 291, source: "EN 10365 catalog" },
  { id: "heb1000", label: "HEB 1000", profileId: "beam_heb_en", selectedSizeId: "heb1000", expectedKgPerM: 314, source: "EN 10365 catalog" },

  /* ---- HEM (EN 10365) ---- */
  { id: "hem100", label: "HEM 100", profileId: "beam_hem_en", selectedSizeId: "hem100", expectedKgPerM: 41.8, source: "EN 10365 catalog" },
  { id: "hem120", label: "HEM 120", profileId: "beam_hem_en", selectedSizeId: "hem120", expectedKgPerM: 52.1, source: "EN 10365 catalog" },
  { id: "hem160", label: "HEM 160", profileId: "beam_hem_en", selectedSizeId: "hem160", expectedKgPerM: 76.2, source: "EN 10365 catalog" },
  { id: "hem180", label: "HEM 180", profileId: "beam_hem_en", selectedSizeId: "hem180", expectedKgPerM: 88.9, source: "EN 10365 catalog" },
  { id: "hem200", label: "HEM 200", profileId: "beam_hem_en", selectedSizeId: "hem200", expectedKgPerM: 103, source: "EN 10365 catalog" },
  { id: "hem220", label: "HEM 220", profileId: "beam_hem_en", selectedSizeId: "hem220", expectedKgPerM: 117, source: "EN 10365 catalog" },
  { id: "hem240", label: "HEM 240", profileId: "beam_hem_en", selectedSizeId: "hem240", expectedKgPerM: 157, source: "EN 10365 catalog" },
  { id: "hem280", label: "HEM 280", profileId: "beam_hem_en", selectedSizeId: "hem280", expectedKgPerM: 189, source: "EN 10365 catalog" },
  { id: "hem300", label: "HEM 300", profileId: "beam_hem_en", selectedSizeId: "hem300", expectedKgPerM: 238, source: "EN 10365 catalog" },

  /* ---- UPN (EN 10365) ---- */
  { id: "upn50", label: "UPN 50", profileId: "channel_upn_en", selectedSizeId: "upn50", expectedKgPerM: 5.59, source: "EN 10365 catalog" },
  { id: "upn65", label: "UPN 65", profileId: "channel_upn_en", selectedSizeId: "upn65", expectedKgPerM: 7.09, source: "EN 10365 catalog" },
  { id: "upn80", label: "UPN 80", profileId: "channel_upn_en", selectedSizeId: "upn80", expectedKgPerM: 8.64, source: "EN 10365 catalog" },
  { id: "upn100", label: "UPN 100", profileId: "channel_upn_en", selectedSizeId: "upn100", expectedKgPerM: 10.6, source: "EN 10365 catalog" },
  { id: "upn120", label: "UPN 120", profileId: "channel_upn_en", selectedSizeId: "upn120", expectedKgPerM: 13.4, source: "EN 10365 catalog" },
  { id: "upn140", label: "UPN 140", profileId: "channel_upn_en", selectedSizeId: "upn140", expectedKgPerM: 16, source: "EN 10365 catalog" },
  { id: "upn160", label: "UPN 160", profileId: "channel_upn_en", selectedSizeId: "upn160", expectedKgPerM: 18.8, source: "EN 10365 catalog" },
  { id: "upn180", label: "UPN 180", profileId: "channel_upn_en", selectedSizeId: "upn180", expectedKgPerM: 22, source: "EN 10365 catalog" },
  { id: "upn200", label: "UPN 200", profileId: "channel_upn_en", selectedSizeId: "upn200", expectedKgPerM: 25.3, source: "EN 10365 catalog" },
  { id: "upn220", label: "UPN 220", profileId: "channel_upn_en", selectedSizeId: "upn220", expectedKgPerM: 29.4, source: "EN 10365 catalog" },
  { id: "upn240", label: "UPN 240", profileId: "channel_upn_en", selectedSizeId: "upn240", expectedKgPerM: 33.2, source: "EN 10365 catalog" },
  { id: "upn260", label: "UPN 260", profileId: "channel_upn_en", selectedSizeId: "upn260", expectedKgPerM: 37.9, source: "EN 10365 catalog" },
  { id: "upn280", label: "UPN 280", profileId: "channel_upn_en", selectedSizeId: "upn280", expectedKgPerM: 41.8, source: "EN 10365 catalog" },
  { id: "upn300", label: "UPN 300", profileId: "channel_upn_en", selectedSizeId: "upn300", expectedKgPerM: 46.2, source: "EN 10365 catalog" },
  { id: "upn320", label: "UPN 320", profileId: "channel_upn_en", selectedSizeId: "upn320", expectedKgPerM: 59.5, source: "EN 10365 catalog" },
  { id: "upn400", label: "UPN 400", profileId: "channel_upn_en", selectedSizeId: "upn400", expectedKgPerM: 71.8, source: "EN 10365 catalog" },

  /* ---- UPE (EN 10279) ---- */
  { id: "upe80", label: "UPE 80", profileId: "channel_upe_en", selectedSizeId: "upe80", expectedKgPerM: 7.9, source: "EN 10279 catalog" },
  { id: "upe100", label: "UPE 100", profileId: "channel_upe_en", selectedSizeId: "upe100", expectedKgPerM: 9.82, source: "EN 10279 catalog" },
  { id: "upe120", label: "UPE 120", profileId: "channel_upe_en", selectedSizeId: "upe120", expectedKgPerM: 12.1, source: "EN 10279 catalog" },
  { id: "upe140", label: "UPE 140", profileId: "channel_upe_en", selectedSizeId: "upe140", expectedKgPerM: 14.5, source: "EN 10279 catalog" },
  { id: "upe160", label: "UPE 160", profileId: "channel_upe_en", selectedSizeId: "upe160", expectedKgPerM: 17, source: "EN 10279 catalog" },
  { id: "upe180", label: "UPE 180", profileId: "channel_upe_en", selectedSizeId: "upe180", expectedKgPerM: 19.7, source: "EN 10279 catalog" },
  { id: "upe200", label: "UPE 200", profileId: "channel_upe_en", selectedSizeId: "upe200", expectedKgPerM: 22.8, source: "EN 10279 catalog" },
  { id: "upe220", label: "UPE 220", profileId: "channel_upe_en", selectedSizeId: "upe220", expectedKgPerM: 26.6, source: "EN 10279 catalog" },
  { id: "upe240", label: "UPE 240", profileId: "channel_upe_en", selectedSizeId: "upe240", expectedKgPerM: 30.2, source: "EN 10279 catalog" },
  { id: "upe270", label: "UPE 270", profileId: "channel_upe_en", selectedSizeId: "upe270", expectedKgPerM: 35.2, source: "EN 10279 catalog" },
  { id: "upe300", label: "UPE 300", profileId: "channel_upe_en", selectedSizeId: "upe300", expectedKgPerM: 44.4, source: "EN 10279 catalog" },
  { id: "upe330", label: "UPE 330", profileId: "channel_upe_en", selectedSizeId: "upe330", expectedKgPerM: 53.2, source: "EN 10279 catalog" },
  { id: "upe360", label: "UPE 360", profileId: "channel_upe_en", selectedSizeId: "upe360", expectedKgPerM: 61.2, source: "EN 10279 catalog" },
  { id: "upe400", label: "UPE 400", profileId: "channel_upe_en", selectedSizeId: "upe400", expectedKgPerM: 72.2, source: "EN 10279 catalog" },

  /* ---- Tee (EN 10055) ---- */
  { id: "t35x4.5", label: "T 35×35×4.5", profileId: "tee_en", selectedSizeId: "t35x4.5", expectedKgPerM: 2.34, source: "EN 10055 catalog" },
  { id: "t45x5.5", label: "T 45×45×5.5", profileId: "tee_en", selectedSizeId: "t45x5.5", expectedKgPerM: 3.66, source: "EN 10055 catalog" },
  { id: "t50x6", label: "T 50×50×6", profileId: "tee_en", selectedSizeId: "t50x6", expectedKgPerM: 4.44, source: "EN 10055 catalog" },
  { id: "t60x7", label: "T 60×60×7", profileId: "tee_en", selectedSizeId: "t60x7", expectedKgPerM: 6.23, source: "EN 10055 catalog" },
  { id: "t70x7", label: "T 70×70×7", profileId: "tee_en", selectedSizeId: "t70x7", expectedKgPerM: 7.29, source: "EN 10055 catalog" },
  { id: "t80x8", label: "T 80×80×8", profileId: "tee_en", selectedSizeId: "t80x8", expectedKgPerM: 9.54, source: "EN 10055 catalog" },
  { id: "t90x9", label: "T 90×90×9", profileId: "tee_en", selectedSizeId: "t90x9", expectedKgPerM: 12.1, source: "EN 10055 catalog" },
  { id: "t100x10", label: "T 100×100×10", profileId: "tee_en", selectedSizeId: "t100x10", expectedKgPerM: 14.8, source: "EN 10055 catalog" },
  { id: "t110x11", label: "T 110×110×11", profileId: "tee_en", selectedSizeId: "t110x11", expectedKgPerM: 17.9, source: "EN 10055 catalog" },
  { id: "t120x12", label: "T 120×120×12", profileId: "tee_en", selectedSizeId: "t120x12", expectedKgPerM: 21.3, source: "EN 10055 catalog" },
  { id: "t130x13", label: "T 130×130×13", profileId: "tee_en", selectedSizeId: "t130x13", expectedKgPerM: 24.9, source: "EN 10055 catalog" },
  { id: "t140x14", label: "T 140×140×14", profileId: "tee_en", selectedSizeId: "t140x14", expectedKgPerM: 28.9, source: "EN 10055 catalog" },

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
