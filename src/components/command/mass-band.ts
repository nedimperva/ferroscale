import { fsWeight, fsWeightUnit } from "@ferroscale/metal-core";

/**
 * The mass band around a theoretical weight.
 *
 * Rolled steel is sold by calculated mass and delivered within a tolerance, so
 * a buyer working to a budget — or to a crane's limit — wants the worst case
 * as well as the nominal. The percentage is the user's own, set in Settings;
 * see the note on `massTolerancePercentStore` for why the app does not put an
 * EN standard's name next to it.
 */
export interface MassBand {
  minKg: number;
  maxKg: number;
  /** "±4%" — the figure in force, for the label. */
  percentLabel: string;
  /** "225.6 – 244.4 kg" */
  rangeLabel: string;
}

export function massBand(totalKg: number | null, percent: number): MassBand | null {
  if (totalKg == null || !Number.isFinite(totalKg) || totalKg <= 0) return null;
  if (!Number.isFinite(percent) || percent <= 0) return null;

  const delta = (totalKg * percent) / 100;
  const minKg = totalKg - delta;
  const maxKg = totalKg + delta;
  return {
    minKg,
    maxKg,
    percentLabel: `\u00b1${percent}%`,
    rangeLabel: `${fsWeight(minKg)} \u2013 ${fsWeight(maxKg)} ${fsWeightUnit()}`,
  };
}
