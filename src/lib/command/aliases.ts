import type { CommandAlias } from "./types";

export const COMMAND_ALIASES: CommandAlias[] = [
  { alias: "hea", name: "HEA", fam: "beam", profileId: "beam_hea_en" },
  { alias: "heb", name: "HEB", fam: "beam", profileId: "beam_heb_en" },
  { alias: "hem", name: "HEM", fam: "beam", profileId: "beam_hem_en" },
  { alias: "ipe", name: "IPE", fam: "beam", profileId: "beam_ipe_en" },
  { alias: "ipn", name: "IPN", fam: "beam", profileId: "beam_ipn_en" },
  { alias: "upn", name: "UPN", fam: "beam", profileId: "channel_upn_en" },
  { alias: "upe", name: "UPE", fam: "beam", profileId: "channel_upe_en" },
  { alias: "shs", name: "SHS", fam: "shs", profileId: null, manualProfileId: "square_hollow" },
  { alias: "rhs", name: "RHS", fam: "rhs", profileId: null, manualProfileId: "rectangular_tube" },
  { alias: "chs", name: "CHS", fam: "chs", profileId: null, manualProfileId: "pipe" },
  { alias: "rnd", name: "Round", fam: "round", profileId: null, manualProfileId: "round_bar" },
  { alias: "sq", name: "Square bar", fam: "sqbar", profileId: null, manualProfileId: "square_bar" },
  { alias: "flt", name: "Flat", fam: "flat", profileId: null, manualProfileId: "flat_bar" },
  { alias: "l", name: "Angle", fam: "angle", profileId: null, manualProfileId: "angle" },
];

const ALIAS_LOOKUP = new Map<string, CommandAlias>(
  COMMAND_ALIASES.map((a) => [a.alias, a]),
);

export const COMMAND_ALIAS_RE = COMMAND_ALIASES
  .map((a) => a.alias)
  .sort((a, b) => b.length - a.length)
  .join("|");

export function findAliasByPrefix(token: string): CommandAlias | null {
  const match = token.match(new RegExp(`^(${COMMAND_ALIAS_RE})`));
  if (!match) return null;
  return ALIAS_LOOKUP.get(match[1]) ?? null;
}

export function findAliasByKey(key: string): CommandAlias | null {
  return ALIAS_LOOKUP.get(key) ?? null;
}

/** Curated standard sizes per family for the suggestion chips. */
export const COMMAND_SIZES: Record<CommandAlias["fam"], string[]> = {
  beam: ["100", "120", "140", "160", "180", "200", "220", "240", "300"],
  shs: ["20x20x2", "30x30x3", "40x40x3", "50x50x3", "60x60x4", "80x80x4"],
  rhs: ["40x20x2", "50x30x3", "60x40x3", "80x40x3", "100x50x4", "120x80x4"],
  chs: ["21.3x2.3", "33.7x2.6", "42.4x2.6", "48.3x3.2", "60.3x3.2", "88.9x3.2"],
  round: ["8", "10", "12", "16", "20", "25", "30", "40"],
  sqbar: ["10", "12", "16", "20", "25", "30", "40"],
  flat: ["20x5", "30x5", "40x8", "50x10", "60x8", "80x10"],
  angle: ["30x30x3", "40x40x4", "50x50x5", "60x60x6", "80x80x8"],
};

export interface CommandGrade {
  id: string;
  label: string;
  alias: string;
  group: string;
  density: number;
}

export const COMMAND_GRADES: CommandGrade[] = [
  { id: "steel-s235jr", label: "S235", alias: "s235", group: "Steel", density: 7850 },
  { id: "steel-s355jr", label: "S355", alias: "s355", group: "Steel", density: 7850 },
  { id: "stainless-304", label: "304", alias: "304", group: "Stainless", density: 8000 },
  { id: "stainless-316l", label: "316L", alias: "316l", group: "Stainless", density: 8000 },
  { id: "al-6060", label: "6060", alias: "6060", group: "Aluminum", density: 2700 },
  { id: "al-6082", label: "6082", alias: "6082", group: "Aluminum", density: 2700 },
];

const GRADE_BY_ALIAS = new Map<string, CommandGrade>(
  COMMAND_GRADES.map((g) => [g.alias, g]),
);
const GRADE_BY_ID = new Map<string, CommandGrade>(
  COMMAND_GRADES.map((g) => [g.id, g]),
);

export function findGradeByAlias(alias: string): CommandGrade | null {
  return GRADE_BY_ALIAS.get(alias.toLowerCase()) ?? null;
}

export function findGradeById(id: string): CommandGrade | null {
  return GRADE_BY_ID.get(id) ?? null;
}
