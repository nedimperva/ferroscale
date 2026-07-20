import type {
  CalculationInput,
  CalculationResult,
  CurrencyCode,
  LengthUnit,
  PriceBasis,
  PriceUnit,
} from "../calculator/types";
import type { DimensionKey, ProfileId } from "../datasets/types";

/** The pricing fields of CalculationInput that Command needs for live totals. */
export interface CommandPricing {
  priceBasis: PriceBasis;
  priceUnit: PriceUnit;
  unitPrice: number;
  currency: CurrencyCode;
  wastePercent: number;
  includeVat: boolean;
  vatPercent: number;
}

/**
 * Structural subset of the web app's DimensionPreset that size suggestions
 * need — keeps the parser package decoupled from app storage models.
 */
export interface CommandSizePreset {
  label?: string;
  selectedSizeId?: string;
  manualDimensionsMm: Partial<Record<DimensionKey, number>>;
  lengthValue?: number;
}

export type CommandFamily =
  | "beam"
  | "tee"
  | "shs"
  | "rhs"
  | "chs"
  | "round"
  | "flat"
  | "angle"
  | "sqbar"
  | "panel"
  | "chequered"
  | "expanded"
  | "corrugated";

export interface CommandAlias {
  alias: string;
  name: string;
  fam: CommandFamily;
  profileId: ProfileId | null;
  manualProfileId?: ProfileId;
}

/** All external state the pure parser needs. */
export interface CommandParserSettings {
  pricing: CommandPricing;
  defaultGradeId: string;
  /** Unit applied to bare-number length tokens (from defaultUnitStore). */
  defaultLengthUnit: LengthUnit;
}

/** Full engine artifacts for a valid query — consumed by save/compare/project. */
export interface CommandCalc {
  input: CalculationInput;
  result: CalculationResult;
}

export interface CommandParseResult {
  raw: string;
  alias: CommandAlias | null;
  size: string;
  hasSize: boolean;
  lengthM: number | null;
  lengthRaw: number | null;
  lengthUnit: LengthUnit;
  /** False when the bare-number fallback supplied the unit. */
  lengthExplicit: boolean;
  qty: number | null;
  realQty: number;
  gradeId: string | null;
  gradeLabel: string | null;
  density: number;
  kgm: number | null;
  /** Non-null iff valid. */
  calc: CommandCalc | null;
  perPieceKg: number | null;
  totalKg: number | null;
  /** result.grandTotalAmount — includes waste and VAT when configured. */
  totalAmount: number | null;
  selectedSizeId: string | null;
  name: string | null;
  valid: boolean;
  /** Parse/validation problems worth telling the user about; [] when clean. */
  issues: CommandParseIssue[];
  /** Echo of the pricing settings used (for sheet display). */
  pricing: CommandPricing;
  /** Non-null when the query contains an inline price token. */
  priceOverride: {
    unitPrice: number;
    priceBasis: PriceBasis;
    priceUnit: PriceUnit;
  } | null;
}

export type CommandParseIssueCode =
  | "unknownToken"
  | "unknownSize"
  | "invalidQty"
  | "invalidGeometry";

/**
 * Structured feedback for input the parser could not act on. `message` is a
 * plain-English fallback for non-web consumers (CLI/Raycast); the web app
 * maps `code` + `params` to localized strings instead.
 */
export interface CommandParseIssue {
  code: CommandParseIssueCode;
  /** The offending raw token (or size text for unknownSize). */
  token: string;
  message: string;
  params?: Record<string, string | number>;
  /** invalidGeometry only: engine validation key, localized under `validation.*`. */
  messageKey?: string;
  messageValues?: Record<string, string | number>;
  /**
   * A near-miss the user probably meant (e.g. "hea120" for a mistyped
   * "hae120", or "120" for an off-catalog "125"). When present, the UI can
   * offer a one-tap "Did you mean …?" fix that swaps `token` for this text in
   * the raw query. Never applied automatically.
   */
  suggestion?: string;
}

export type CommandTokenKind = "profile" | "len" | "qty" | "grade" | "price" | "unknown";

export interface CommandSuggestionItem {
  label: string;
  sub?: string;
  fam?: CommandFamily;
  kind: "profile" | "size" | "length" | "qty" | "grade" | "save" | "recent";
  ins: string;
  /** Replace the trailing partial token on insert. */
  replaceLast?: boolean;
  /** Append directly onto the profile token (no space). */
  appendProfile?: boolean;
  /** Insert with a leading space if needed. */
  space?: boolean;
}

export interface CommandSuggestion {
  hint: string;
  items: CommandSuggestionItem[];
}
