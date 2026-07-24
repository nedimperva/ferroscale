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

export function fsMoney(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export { CURRENCY_SYMBOLS } from "../calculator/types";
