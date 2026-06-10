import { MATERIAL_GRADES, METAL_FAMILIES } from "@ferroscale/metal-core";
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

export function findAliasByProfileId(profileId: string): CommandAlias | null {
  return (
    COMMAND_ALIASES.find(
      (a) => a.profileId === profileId || a.manualProfileId === profileId,
    ) ?? null
  );
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
  aliases: string[];
  group: string;
  density: number;
}

/** Short labels + typeable aliases per MATERIAL_GRADES id. Aliases must not
 *  collide with profile aliases (none starts with hea|heb|hem|ipe|...). */
const GRADE_META: Record<string, { short: string; aliases: string[] }> = {
  "steel-s235jr": { short: "S235", aliases: ["s235", "s235jr"] },
  "steel-s355jr": { short: "S355", aliases: ["s355", "s355jr"] },
  "steel-s420m": { short: "S420", aliases: ["s420", "s420m"] },
  "stainless-304": { short: "304", aliases: ["304", "1.4301", "a2"] },
  "stainless-316": { short: "316", aliases: ["316", "1.4401"] },
  "stainless-316l": { short: "316L", aliases: ["316l", "1.4404", "a4"] },
  "al-6060": { short: "6060", aliases: ["6060"] },
  "al-6082": { short: "6082", aliases: ["6082"] },
  "al-7075": { short: "7075", aliases: ["7075"] },
};

export const COMMAND_GRADES: CommandGrade[] = MATERIAL_GRADES.map((g) => ({
  id: g.id,
  label: GRADE_META[g.id]?.short ?? g.label,
  aliases: GRADE_META[g.id]?.aliases ?? [g.id],
  group: METAL_FAMILIES.find((f) => f.id === g.familyId)?.label ?? g.familyId,
  density: g.densityKgPerM3,
}));

const GRADE_BY_ALIAS = new Map<string, CommandGrade>(
  COMMAND_GRADES.flatMap((g) => g.aliases.map((a) => [a, g] as const)),
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
