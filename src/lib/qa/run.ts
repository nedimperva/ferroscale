import { calculateMetal } from "@/lib/calculator/engine";
import { DATASET_VERSION } from "@/lib/datasets/version";
import {
  QA_BENCHMARK_ROWS,
  QA_TOLERANCE_PCT,
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
  return {
    rows,
    passCount: rows.length - failCount,
    failCount,
    maxDeltaPct: Math.max(...rows.map((r) => r.deltaPct ?? Number.POSITIVE_INFINITY)),
    allPass: failCount === 0,
    tolerancePct: QA_TOLERANCE_PCT,
    datasetVersion: DATASET_VERSION,
  };
}
