import type { ProfileId } from "@ferroscale/metal-core";

export type CommandFamily =
  | "beam"
  | "shs"
  | "rhs"
  | "chs"
  | "round"
  | "flat"
  | "angle"
  | "sqbar";

export interface CommandAlias {
  alias: string;
  name: string;
  fam: CommandFamily;
  profileId: ProfileId | null;
  manualProfileId?: ProfileId;
}

export interface CommandSettings {
  currency: "EUR" | "USD" | "GBP";
  rate: number;
  density: number;
  defaultGradeId: string;
}

export interface CommandParseResult {
  raw: string;
  alias: CommandAlias | null;
  size: string;
  hasSize: boolean;
  lengthM: number | null;
  lengthRaw: number | null;
  lengthUnit: "mm" | "cm" | "m";
  qty: number | null;
  realQty: number;
  gradeId: string | null;
  gradeLabel: string | null;
  density: number;
  kgm: number | null;
  perPieceKg: number | null;
  totalKg: number | null;
  totalEur: number | null;
  selectedSizeId: string | null;
  name: string | null;
  valid: boolean;
  rate: number;
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
