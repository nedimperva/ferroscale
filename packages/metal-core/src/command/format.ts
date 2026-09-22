// Weight is always shown in exact kilograms — no tonne conversion, which
// would round away the kilograms the user cares about. Kept to 2 decimals
// (10 g resolution) with thousands separators, e.g. "12,347.5".
export function fsWeight(kg: number): string {
  return kg.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Weight is always reported in kilograms now (no tonne switch).
export function fsWeightUnit(): "kg" {
  return "kg";
}

/**
 * A length in metres for the equation line and breakdown. Converted lengths
 * came through raw (`6ft` printed as "1.8288000000000002 m"); the millimetre
 * is the finest unit the app cuts in, so three decimals is exact.
 */
export function fsLength(m: number): string {
  return m.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: false,
  });
}

/**
 * kg/m to two decimals, rounded the same way fsWeight rounds the headline —
 * `toFixed` rounds the binary value, so 14.915 kg/m printed as 14.91 under a
 * hero that said 14.92 kg.
 */
export function fsKgm(kgm: number): string {
  return kgm.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

export function fsMoney(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export { CURRENCY_SYMBOLS } from "../calculator/types";
