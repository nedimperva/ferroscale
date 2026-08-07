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
  /**
   * An entry can hold several parts — a gate frame, a railing bay. When it
   * does, the headline figures are the sum and these are the lines behind it.
   */
  parts: SavedPartModel[];
  isAssembly: boolean;
}

function formatLengthM(mm: number): string {
  return Number((mm / 1000).toFixed(3)).toString();
}

/** One part of a multi-part entry, re-priced at today's rate like the whole. */
export interface SavedPartModel {
  id: string;
  name: string;
  specLabel: string;
  detailLine: string;
  totalKg: number;
  totalAmount: number | null;
}

function partModel(
  part: SavedEntry["parts"][number],
  settings: CommandParserSettings,
  defaultUnit: LengthUnit,
): SavedPartModel {
  const query = inputToQuery(part.input, defaultUnit, {
    defaultGradeId: settings.defaultGradeId,
    omitPrice: true,
  });
  const parsed = query ? cmdParse(`${query} `, settings) : null;
  const live = parsed?.valid ? parsed : null;
  const r = part.result;
  return {
    id: part.id,
    name: part.name,
    specLabel: live?.name ?? part.normalizedProfile?.shortLabel ?? r.profileLabel,
    detailLine: `${live?.lengthM ?? formatLengthM(r.lengthMm)} m × ${live?.realQty ?? r.quantity}`,
    totalKg: live?.totalKg ?? r.totalWeightKg,
    totalAmount: live?.totalAmount ?? null,
  };
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
  // An assembly's headline is its parts, not one part's dimensions.
  const detailLine =
    entry.parts.length > 1
      ? ""
      : [
          `${live?.lengthM ?? formatLengthM(r.lengthMm)} m × ${live?.realQty ?? r.quantity}`,
          grade,
        ]
          .filter(Boolean)
          .join(" · ");

  const storedRate = entry.input.unitPrice;
  const rate = settings.pricing.unitPrice;

  // Multi-part entries are the sum of their parts; single-part entries are
  // exactly the one line, so both paths go through the same arithmetic.
  const parts = entry.parts.map((part) => partModel(part, settings, defaultUnit));
  const isAssembly = parts.length > 1;
  const totalAmount = isAssembly
    ? parts.reduce<number | null>(
        (sum, part) => (sum == null || part.totalAmount == null ? null : sum + part.totalAmount),
        0,
      )
    : live?.totalAmount ?? null;
  const totalKg = isAssembly
    ? parts.reduce((sum, part) => sum + part.totalKg, 0)
    : live?.totalKg ?? r.totalWeightKg;
  const storedAmount = isAssembly
    ? entry.parts.reduce((sum, part) => sum + part.result.grandTotalAmount, 0)
    : r.grandTotalAmount;

  return {
    entry,
    query,
    parsed: live,
    fam: familyForInput(entry.input),
    specLabel,
    detailLine,
    totalKg,
    totalAmount,
    perPieceKg: isAssembly ? null : live?.perPieceKg ?? r.unitWeightKg,
    // Per-metre weight is a property of one profile, not of an assembly.
    kgm: isAssembly ? null : live?.kgm ?? null,
    currencySymbol: CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€",
    rate,
    rateUnit: settings.pricing.priceUnit === "piece" ? "pc" : settings.pricing.priceUnit,
    storedAmount,
    storedRate,
    parts,
    isAssembly,
    // Only claim a re-price when the money actually moved — a currency or
    // basis change with the same number would otherwise read as a false alarm.
    repriced: totalAmount != null && Math.abs(totalAmount - storedAmount) >= 0.005,
  };
}
