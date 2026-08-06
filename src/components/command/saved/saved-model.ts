import { cmdParse, inputToQuery } from "@ferroscale/metal-core";
import { CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import type {
  CommandFamily,
  CommandParseResult,
  CommandParserSettings,
} from "@ferroscale/metal-core";
import type { LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import { familyForInput } from "../command-copy";

/**
 * Everything a saved card renders, derived once per entry.
 *
 * The important decision lives here: **a saved entry's identity is its
 * geometry, and its price is always today's**. The stored result is a
 * snapshot of the rate at save time; showing that months later (silently,
 * next to today's settings) is what made saved entries untrustworthy. So the
 * card re-parses the entry at the *current* pricing settings and, when the
 * stored rate differs, says so instead of hiding it.
 */
export interface SavedCardModel {
  entry: SavedEntry;
  /** The command line this entry restores into; "" when it has no alias. */
  query: string;
  /** Live parse at current settings — also the source for the drawing. */
  parsed: CommandParseResult | null;
  fam?: CommandFamily;
  /** "HEA 120" — the spec, regardless of what the entry is named. */
  specLabel: string;
  /** "6 m × 2 · S235" */
  detailLine: string;
  totalKg: number | null;
  totalAmount: number | null;
  perPieceKg: number | null;
  kgm: number | null;
  currencySymbol: string;
  /** Rate the live figures used (today's), e.g. 1.2 and "kg". */
  rate: number;
  rateUnit: string;
  /** Total as it stood when saved, and whether today's rate moved it. */
  storedAmount: number;
  storedRate: number;
  repriced: boolean;
}

function formatLengthM(mm: number): string {
  return Number((mm / 1000).toFixed(3)).toString();
}

export function buildSavedCardModel(
  entry: SavedEntry,
  settings: CommandParserSettings,
  defaultUnit: LengthUnit,
): SavedCardModel {
  const r = entry.result;
  // omitPrice: restore at today's rate, so the line the card opens shows the
  // same money the card shows.
  const query = inputToQuery(entry.input, defaultUnit, {
    defaultGradeId: settings.defaultGradeId,
    omitPrice: true,
  });
  const parsed = query ? cmdParse(`${query} `, settings) : null;
  const live = parsed?.valid ? parsed : null;

  const specLabel =
    live?.name ?? entry.normalizedProfile?.shortLabel ?? r.profileLabel;
  const grade = live?.gradeLabel ?? r.gradeLabel;
  const detailLine = [
    `${live?.lengthM ?? formatLengthM(r.lengthMm)} m × ${live?.realQty ?? r.quantity}`,
    grade,
  ]
    .filter(Boolean)
    .join(" · ");

  const storedRate = entry.input.unitPrice;
  const rate = settings.pricing.unitPrice;
  const totalAmount = live?.totalAmount ?? null;

  return {
    entry,
    query,
    parsed: live,
    fam: familyForInput(entry.input),
    specLabel,
    detailLine,
    totalKg: live?.totalKg ?? r.totalWeightKg,
    totalAmount,
    perPieceKg: live?.perPieceKg ?? r.unitWeightKg,
    kgm: live?.kgm ?? null,
    currencySymbol: CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€",
    rate,
    rateUnit: settings.pricing.priceUnit === "piece" ? "pc" : settings.pricing.priceUnit,
    storedAmount: r.grandTotalAmount,
    storedRate,
    // Only claim a re-price when the money actually moved — a currency or
    // basis change with the same number would otherwise read as a false alarm.
    repriced:
      totalAmount != null && Math.abs(totalAmount - r.grandTotalAmount) >= 0.005,
  };
}
