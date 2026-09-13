import { calculateMetal } from "@/lib/calculator/engine";
import { DATASET_VERSION } from "@/lib/datasets/version";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles/index";
import {
  QA_BENCHMARK_ROWS,
  QA_TOLERANCE_PCT,
  QA_UNVERIFIED_SIZES,
  benchmarkRowToInput,
  type QaBenchmarkRow,
} from "./benchmark";

export interface QaResultRow {
  row: QaBenchmarkRow;
  actualKgPerM: number | null;
  deltaPct: number | null;
  pass: boolean;
}

export interface QaReport {
  rows: QaResultRow[];
  passCount: number;
  failCount: number;
  maxDeltaPct: number;
  allPass: boolean;
  tolerancePct: number;
  datasetVersion: string;
  /** EN standard sizes carrying an independent reference. */
  coveredSizes: number;
  /** EN standard sizes in the datasets, checked or not. */
  totalSizes: number;
  /** Sizes whose reference and stored area disagree and are not yet settled. */
  unverifiedSizes: number;
}

/** Run every benchmark row through the live engine and compare. Pure. */
export function runFormulaQa(): QaReport {
  const rows: QaResultRow[] = QA_BENCHMARK_ROWS.map((row) => {
    const response = calculateMetal(benchmarkRowToInput(row));
    if (!response.ok) {
      return { row, actualKgPerM: null, deltaPct: null, pass: false };
    }
    const actual = response.result.unitWeightKg; // 1 m piece → kg/m
    const deltaPct = (Math.abs(actual - row.expectedKgPerM) / row.expectedKgPerM) * 100;
    return { row, actualKgPerM: actual, deltaPct, pass: deltaPct <= QA_TOLERANCE_PCT };
  });

  const failCount = rows.filter((r) => !r.pass).length;
  const totalSizes = PROFILE_DEFINITIONS.reduce(
    (sum, profile) => sum + (profile.mode === "standard" ? profile.sizes.length : 0),
    0,
  );
  const coveredSizes = new Set(
    QA_BENCHMARK_ROWS.filter((row) => row.selectedSizeId).map(
      (row) => `${row.profileId}/${row.selectedSizeId}`,
    ),
  ).size;

  return {
    rows,
    passCount: rows.length - failCount,
    failCount,
    maxDeltaPct: Math.max(...rows.map((r) => r.deltaPct ?? Number.POSITIVE_INFINITY)),
    allPass: failCount === 0,
    tolerancePct: QA_TOLERANCE_PCT,
    datasetVersion: DATASET_VERSION,
    coveredSizes,
    totalSizes,
    unverifiedSizes: QA_UNVERIFIED_SIZES.length,
  };
}
