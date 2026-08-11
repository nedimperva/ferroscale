import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParseResult } from "@ferroscale/metal-core";
import { massBand } from "./mass-band";

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
  | "massBand"
  | "density"
  | "rate"
  | "perPiecePrice"
  | "subtotal"
  | "waste"
  | "vat"
  | "totalCost"
  | "sellPrice";

export interface BreakdownRow {
  id: BreakdownRowId;
  label: string;
  value: string;
}

export interface BreakdownRows {
  geometry: BreakdownRow[];
  pricing: BreakdownRow[];
}

export interface BreakdownOptions {
  /** Margin on top of cost; 0 (the default) leaves the sell row out entirely. */
  marginPercent?: number;
  /** Mass tolerance ±%; 0 (the default) leaves the band row out entirely. */
  massTolerancePercent?: number;
}

/** Cost plus margin — what you'd quote, not what it costs you. */
export function sellPrice(cost: number, marginPercent: number): number {
  return cost * (1 + marginPercent / 100);
}

export function buildBreakdownRows(
  p: CommandParseResult,
  t: CommandT,
  options: BreakdownOptions = {},
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
      value: `${fsWeight(r.unitWeightKg)} ${fsWeightUnit()}`,
    },
    {
      id: "totalWeight",
      label: t("result.totalWeight"),
      value: `${fsWeight(r.totalWeightKg)} ${fsWeightUnit()}`,
    },
    { id: "density", label: t("result.density"), value: `${r.densityKgPerM3} kg/m³` },
  ];

  // Theoretical mass is what the formula gives; the band is what may arrive.
  const band = massBand(r.totalWeightKg, options.massTolerancePercent ?? 0);
  if (band) {
    geometry.splice(geometry.findIndex((row) => row.id === "totalWeight") + 1, 0, {
      id: "massBand",
      label: t("result.massBand", { percent: band.percentLabel }),
      value: band.rangeLabel,
    });
  }

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
    ...(options.marginPercent && options.marginPercent > 0
      ? [{
          id: "sellPrice" as const,
          label: t("result.sellPrice", { percent: options.marginPercent }),
          value: `${sym} ${fsMoney(sellPrice(r.grandTotalAmount, options.marginPercent))}`,
        }]
      : []),
  ];

  return { geometry, pricing };
}
