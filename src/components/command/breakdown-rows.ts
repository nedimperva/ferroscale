import {
  CURRENCY_SYMBOLS,
  fsKgm,
  fsLength,
  fsMoney,
  fsWeight,
  fsWeightUnit,
  getProfileById,
  getSectionProperties,
  SECTION_PROPERTY_SOURCES,
  SHEET_LIKE_FAMILIES,
  toMillimeters,
} from "@ferroscale/metal-core";
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
  | "massPerArea"
  | "length"
  | "pieces"
  | "perPieceWeight"
  | "totalWeight"
  | "massBand"
  | "density"
  | "sectionArea"
  | "formula"
  | "reference"
  | "rate"
  | "perPiecePrice"
  | "subtotal"
  | "waste"
  | "vat"
  | "totalCost"
  | "sellPrice"
  | "secIy"
  | "secWelY"
  | "secWplY"
  | "secIyRadius"
  | "secIz"
  | "secWelZ"
  | "secWplZ"
  | "secIzRadius"
  | "secSource";

export interface BreakdownRow {
  id: BreakdownRowId;
  label: string;
  value: string;
}

export interface BreakdownRows {
  geometry: BreakdownRow[];
  pricing: BreakdownRow[];
  /**
   * Published section properties for a standard size, empty for everything
   * else — a manual section's figures would be computed, not cited.
   */
  section: BreakdownRow[];
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

  const isSheet = Boolean(p.alias && SHEET_LIKE_FAMILIES.has(p.alias.fam));
  const widthEntry = p.calc.input.manualDimensions?.width;
  const widthM = widthEntry ? toMillimeters(widthEntry.value, widthEntry.unit) / 1000 : 0;
  const areaM2 = widthM > 0 && p.lengthM ? widthM * p.lengthM : 0;
  const massPerAreaVal = areaM2 > 0 ? r.unitWeightKg / areaM2 : null;

  const massRateRow: BreakdownRow =
    isSheet && massPerAreaVal != null
      ? { id: "massPerArea", label: t("result.massPerArea"), value: `${massPerAreaVal.toFixed(2)} kg/m²` }
      : { id: "massPerMetre", label: t("result.massPerMetre"), value: `${fsKgm(p.kgm)} kg/m` };

  const geometry: BreakdownRow[] = [
    massRateRow,
    { id: "length", label: t("result.length"), value: `${fsLength(p.lengthM ?? 0)} m` },
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
    // The engine has always returned the area, the formula and the standard it
    // read them from; the panel never showed them, so a result that claimed to
    // be traceable could not actually be traced from the screen.
    {
      id: "sectionArea",
      label: t("result.sectionArea"),
      value: `${(r.areaMm2 / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} cm²`,
    },
    { id: "formula", label: t("result.formula"), value: r.formulaLabel },
    {
      id: "reference",
      label: t("result.reference"),
      value: r.referenceLabels.filter((label) => !label.startsWith("Dataset ")).join(" · ")
        + ` · ${t("result.dataset", { version: r.datasetVersion })}`,
    },
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

  return { geometry, pricing, section: sectionRows(p, t) };
}

/** Catalogue figures carry four significant digits; show what was printed. */
function catalogue(value: number, unit: string) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${unit}`;
}

function sectionRows(p: CommandParseResult, t: CommandT): BreakdownRow[] {
  const input = p.calc?.input;
  if (!input || getProfileById(input.profileId)?.mode !== "standard") return [];
  const s = getSectionProperties(input.selectedSizeId);
  if (!s) return [];
  const source = SECTION_PROPERTY_SOURCES[s.source].shortLabel;
  return [
    { id: "secIy", label: t("result.secIy"), value: catalogue(s.iyCm4, "cm⁴") },
    { id: "secWelY", label: t("result.secWelY"), value: catalogue(s.welYCm3, "cm³") },
    { id: "secWplY", label: t("result.secWplY"), value: catalogue(s.wplYCm3, "cm³") },
    { id: "secIyRadius", label: t("result.secIyRadius"), value: `${s.iyRadiusCm.toFixed(2)} cm` },
    { id: "secIz", label: t("result.secIz"), value: catalogue(s.izCm4, "cm⁴") },
    { id: "secWelZ", label: t("result.secWelZ"), value: catalogue(s.welZCm3, "cm³") },
    { id: "secWplZ", label: t("result.secWplZ"), value: catalogue(s.wplZCm3, "cm³") },
    { id: "secIzRadius", label: t("result.secIzRadius"), value: `${s.izRadiusCm.toFixed(2)} cm` },
    {
      id: "secSource",
      label: t("result.secSource"),
      value: s.pdfPage ? t("result.secSourcePage", { source, page: s.pdfPage }) : source,
    },
  ];
}
