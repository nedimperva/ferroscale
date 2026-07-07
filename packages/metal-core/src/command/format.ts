export function fsWeight(kg: number): string {
  if (kg >= 1000) {
    return (kg / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return kg.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function fsWeightUnit(kg: number): "kg" | "t" {
  return kg >= 1000 ? "t" : "kg";
}

export function fsMoney(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export { CURRENCY_SYMBOLS } from "../calculator/types";
