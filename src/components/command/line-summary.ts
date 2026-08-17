import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { formatCommandParseName } from "./command-copy";
import type { ShareCardModel } from "@/lib/command/share-card";

type CommandT = (key: string, values?: Record<string, string | number>) => string;

/**
 * One row per item on a `+`-joined line. The equation line can only describe a
 * single calculation, so a multi-item line replaces it with this: what each
 * item is, and what each item weighs and costs — because the hero only shows
 * the sum, and a sum with no breakdown is a number you can't check.
 */
export interface LineSummaryRow {
  /** "HEA 120 · 6 m x 2" */
  label: string;
  weight: string;
  amount: string;
  /** True when the item hasn't parsed to a calculation yet. */
  pending: boolean;
}

/** What the WhatsApp card should say — one part, or the assembly and every line. */
export function buildShareCardModel(
  t: CommandT,
  p: CommandParseResult,
  line: CommandLine,
  query: string,
): ShareCardModel {
  const sym = CURRENCY_SYMBOLS[p.pricing.currency] ?? "€";
  const totalKg = line.multi ? line.totalKg : p.totalKg;
  const totalAmount = line.multi ? line.totalAmount : p.totalAmount;
  return {
    title: line.multi
      ? t("result.assembly", { count: line.items.length })
      : (formatCommandParseName(t, p) ?? p.name ?? query),
    query,
    weight: totalKg != null ? `${fsWeight(totalKg)} ${fsWeightUnit()}` : null,
    amount: totalAmount != null ? `${sym}${fsMoney(totalAmount)}` : null,
    items: line.multi
      ? buildLineSummary(line, t)
          .filter((row) => !row.pending)
          .map((row) => ({ label: row.label, weight: row.weight, amount: row.amount }))
      : [],
  };
}

export function buildLineSummary(line: CommandLine, t: CommandT): LineSummaryRow[] {
  return line.items.map((item) => {
    const parse = item.parse;
    const sym = CURRENCY_SYMBOLS[parse.pricing.currency] ?? "";
    const name = formatCommandParseName(t, parse) ?? parse.name ?? "";
    const spec = parse.lengthRaw != null
      ? `${parse.lengthRaw}${parse.lengthUnit} x ${parse.realQty}`
      : "";
    return {
      label: [name || t("query.placeholder"), spec].filter(Boolean).join(" \u00b7 "),
      weight: parse.totalKg != null ? `${fsWeight(parse.totalKg)} ${fsWeightUnit()}` : "\u2014",
      amount: parse.totalAmount != null ? `${sym} ${fsMoney(parse.totalAmount)}` : "\u2014",
      pending: !parse.valid,
    };
  });
}
