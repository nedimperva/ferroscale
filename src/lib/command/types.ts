import type {
  CalculationInput,
  CalculationResult,
  LengthUnit,
  ProfileId,
} from "@ferroscale/metal-core";
import type { CommandPricing } from "@/lib/settings-stores";

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
  /** Echo of the pricing settings used (for sheet display). */
  pricing: CommandPricing;
}

export type CommandTokenKind = "profile" | "len" | "qty" | "grade" | "unknown";

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
