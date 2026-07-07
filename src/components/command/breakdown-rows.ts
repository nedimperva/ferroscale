import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParseResult } from "@ferroscale/metal-core";

/**
 * The single source of truth for the result-breakdown content. Both renderers
 * — the mobile result sheet and the desktop right-rail card — consume these
 * rows; each picks its subset and styling but never re-derives a value.
 */

type CommandT = (key: string, values?: Record<string, string | number>) => string;

export type BreakdownRowId =
  | "massPerMetre"
  | "length"
  | "pieces"
  | "perPieceWeight"
  | "totalWeight"
  | "density"
  | "rate"
  | "perPiecePrice"
  | "subtotal"
  | "waste"
  | "vat"
  | "totalCost";

export interface BreakdownRow {
  id: BreakdownRowId;
  label: string;
  value: string;
}

export interface BreakdownRows {
  geometry: BreakdownRow[];
  pricing: BreakdownRow[];
}

export function buildBreakdownRows(
  p: CommandParseResult,
  t: CommandT,
): BreakdownRows | null {
  if (!p.calc || p.kgm == null) return null;
  const r = p.calc.result;
  const sym = CURRENCY_SYMBOLS[r.currency] ?? "€";

  const geometry: BreakdownRow[] = [
    { id: "massPerMetre", label: t("result.massPerMetre"), value: `${p.kgm.toFixed(2)} kg/m` },
    { id: "length", label: t("result.length"), value: `${p.lengthM} m` },
    { id: "pieces", label: t("result.pieces"), value: `× ${p.realQty}` },
    {
      id: "perPieceWeight",
      label: t("result.perPiece"),
      value: `${fsWeight(r.unitWeightKg)} ${fsWeightUnit(r.unitWeightKg)}`,
    },
    {
      id: "totalWeight",
      label: t("result.totalWeight"),
      value: `${fsWeight(r.totalWeightKg)} ${fsWeightUnit(r.totalWeightKg)}`,
    },
    { id: "density", label: t("result.density"), value: `${r.densityKgPerM3} kg/m³` },
  ];

  const pricing: BreakdownRow[] = [
    {
      id: "rate",
      label: t("result.rate"),
      value: `${sym} ${fsMoney(p.calc.input.unitPrice)}/${r.priceUnit}`,
    },
    {
      id: "perPiecePrice",
      label: t("result.perPiecePrice"),
      value: `${sym} ${fsMoney(r.unitPriceAmount)}`,
    },
    { id: "subtotal", label: t("result.subtotal"), value: `${sym} ${fsMoney(r.subtotalAmount)}` },
    ...(p.pricing.wastePercent > 0
      ? [{
          id: "waste" as const,
          label: t("result.waste", { percent: p.pricing.wastePercent }),
          value: `${sym} ${fsMoney(r.wasteAmount)}`,
        }]
      : []),
    ...(p.pricing.includeVat
      ? [{
          id: "vat" as const,
          label: t("result.vat", { percent: p.pricing.vatPercent }),
          value: `${sym} ${fsMoney(r.vatAmount)}`,
        }]
      : []),
    { id: "totalCost", label: t("result.totalCost"), value: `${sym} ${fsMoney(r.grandTotalAmount)}` },
  ];

  return { geometry, pricing };
}
