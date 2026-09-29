import { MATERIAL_GRADES, METAL_FAMILIES } from "../datasets/materials";
import type { CommandAlias } from "./types";

export const COMMAND_ALIASES: CommandAlias[] = [
  { alias: "hea", name: "HEA", fam: "beam", profileId: "beam_hea_en" },
  { alias: "heb", name: "HEB", fam: "beam", profileId: "beam_heb_en" },
  { alias: "hem", name: "HEM", fam: "beam", profileId: "beam_hem_en" },
  { alias: "ipe", name: "IPE", fam: "beam", profileId: "beam_ipe_en" },
  { alias: "ipn", name: "IPN", fam: "beam", profileId: "beam_ipn_en" },
  { alias: "upn", name: "UPN", fam: "beam", profileId: "channel_upn_en" },
  { alias: "upe", name: "UPE", fam: "beam", profileId: "channel_upe_en" },
  { alias: "t", name: "T", fam: "tee", profileId: "tee_en" },
  { alias: "shs", name: "SHS", fam: "shs", profileId: null, manualProfileId: "square_hollow" },
  { alias: "rhs", name: "RHS", fam: "rhs", profileId: null, manualProfileId: "rectangular_tube" },
  { alias: "chs", name: "CHS", fam: "chs", profileId: null, manualProfileId: "pipe" },
  { alias: "rnd", name: "Round", fam: "round", profileId: null, manualProfileId: "round_bar" },
  { alias: "sq", name: "Square bar", fam: "sqbar", profileId: null, manualProfileId: "square_bar" },
  { alias: "flt", name: "Flat", fam: "flat", profileId: null, manualProfileId: "flat_bar" },
  { alias: "l", name: "Angle", fam: "angle", profileId: null, manualProfileId: "angle" },
  // "Sheet" and "Plate" are the same product class — just different EN
  // standards for thin vs thick. Both aliases resolve to the unified "panel"
  // family and the parser routes to the right backing profile by thickness.
  { alias: "plt", name: "Plate", fam: "panel", profileId: null },
  { alias: "sht", name: "Sheet", fam: "panel", profileId: null },
  { alias: "chq", name: "Chequered", fam: "chequered", profileId: null, manualProfileId: "chequered_plate" },
  { alias: "xpm", name: "Expanded", fam: "expanded", profileId: null, manualProfileId: "expanded_metal" },
  { alias: "corr", name: "Corrugated", fam: "corrugated", profileId: null, manualProfileId: "corrugated_sheet" },
];

/**
 * Spellings people reach for that are not the canonical alias. Typing the
 * obvious word got "Didn't understand" for every one of these — `rd30`,
 * `pipe60.3x3.2`, `plate1500x3000x20`, `flat80x8` — while the working forms
 * were `rnd`, `chs`, `plt`, `flt`. The canonical alias is still what the app
 * writes and what suggestions offer; these only widen what it will read.
 *
 * Longer spellings also settle the prefix collision with the one-letter
 * aliases: `t` used to swallow the start of `tube`, reporting the mangled
 * `unknownSize("ube60.3x3.2")`.
 */
const COMMAND_ALIAS_SYNONYMS: Record<string, string> = {
  // English
  rd: "rnd",
  round: "rnd",
  pipe: "chs",
  tube: "chs",
  box: "shs",
  plate: "plt",
  sheet: "sht",
  flat: "flt",
  tee: "t",
  angle: "l",
  square: "sq",
  bar: "rnd",
  channel: "upn",
  chequered: "chq",
  checker: "chq",
  expanded: "xpm",
  corrugated: "corr",
  // Bosnian / Croatian / Serbian — with and without diacritics, because the
  // phone keypad has none and plenty of desktop keyboards are set to English.
  cijev: "chs",
  cijevi: "chs",
  cev: "chs",
  kutijasti: "shs",
  kutija: "shs",
  lim: "sht",
  "ploča": "plt",
  ploca: "plt",
  flah: "flt",
  plosnati: "flt",
  plosnata: "flt",
  pljosnati: "flt",
  pljosnata: "flt",
  pljosnato: "flt",
  plosnato: "flt",
  "šipka": "rnd",
  sipka: "rnd",
  okrugli: "rnd",
  okrugla: "rnd",
  kvadrat: "sq",
  kvadratni: "sq",
  kvadratna: "sq",
  ugaonik: "l",
  kutnik: "l",
  rebrasti: "chq",
  riflani: "chq",
  trapezni: "corr",
  valoviti: "corr",
};

/**
 * Words that name a kind of section but not which one — "tube", "cijev", "bar".
 * The number of dimensions typed after them says: a tube with three is box
 * section (square when the sides match), with two it is round; a bar with one
 * is round, with two it is flat. Without this, "tube 40x40x3" was read as a
 * pipe and rejected for its wall.
 */
const ROUTED_BY_DIMS: Record<string, (dims: number[]) => string | null> = {};
const hollow = (dims: number[]) =>
  dims.length === 3 ? (dims[0] === dims[1] ? "shs" : "rhs") : dims.length === 2 ? "chs" : null;
const box = (dims: number[]) =>
  dims.length === 3 ? (dims[0] === dims[1] ? "shs" : "rhs") : dims.length === 2 ? "shs" : null;
const bar = (dims: number[]) =>
  dims.length === 1 ? "rnd" : dims.length === 2 ? "flt" : null;
for (const w of ["tube", "cijev", "cijevi", "cev"]) ROUTED_BY_DIMS[w] = hollow;
for (const w of ["box", "kutijasti", "kutija"]) ROUTED_BY_DIMS[w] = box;
for (const w of ["bar", "šipka", "sipka"]) ROUTED_BY_DIMS[w] = bar;

const ROUTE_TARGETS: Record<string, string[]> = {};
for (const w of ["tube", "cijev", "cijevi", "cev"]) ROUTE_TARGETS[w] = ["chs", "shs", "rhs"];
for (const w of ["box", "kutijasti", "kutija"]) ROUTE_TARGETS[w] = ["shs", "rhs"];
for (const w of ["bar", "šipka", "sipka"]) ROUTE_TARGETS[w] = ["rnd", "flt"];

/**
 * Every profile a word can stand for: the ones a routed word ("cijev") may
 * resolve to, or just its own. Size suggestions search all of them.
 */
export function aliasCandidates(typedKey: string): CommandAlias[] {
  const keys = ROUTE_TARGETS[typedKey.toLowerCase()];
  if (!keys) {
    const own = ALIAS_LOOKUP.get(typedKey.toLowerCase());
    return own ? [own] : [];
  }
  return keys.map((k) => ALIAS_LOOKUP.get(k)).filter((a): a is CommandAlias => !!a);
}

/**
 * The profile a routed word means for the size typed after it, or null when
 * the word is not routed (or the size does not settle it).
 */
export function routeAliasByDims(typedKey: string, size: string): CommandAlias | null {
  const route = ROUTED_BY_DIMS[typedKey];
  if (!route) return null;
  const parts = size.split("x");
  if (parts.some((d) => !/^\d+(?:\.\d+)?$/.test(d))) return null;
  const key = route(parts.map(Number));
  return key ? (ALIAS_LOOKUP.get(key) ?? null) : null;
}

/**
 * Two words that together name one profile — "square tube", "kvadratna
 * cijev", "flat bar". Read word by word, the first named a different profile
 * ("square" is square bar) and the second was dropped as a duplicate, so the
 * line failed with nothing said. Built from shape adjectives × nouns so every
 * gender and spelling of the adjective works with every noun.
 */
const PHRASE_MODIFIERS: Record<string, string[]> = {
  square: ["square", "kvadratna", "kvadratni", "kvadratne", "kvadratnu", "kvadratnih"],
  rect: [
    "rectangular", "rect",
    "pravougaona", "pravougaoni", "pravougaone", "pravougaonu",
    "pravokutna", "pravokutni", "pravokutne", "pravokutnu",
  ],
  round: ["round", "okrugla", "okrugli", "okrugle", "okruglu", "okruglih"],
  flat: ["flat", "plosnata", "plosnati", "plosnate", "pljosnata", "pljosnati", "pljosnate"],
  hollow: ["hollow", "box", "šuplja", "suplja", "šuplji", "suplji", "kutijasta", "kutijasti"],
  chequered: ["chequered", "checkered", "checker", "tread", "rebrasti", "rebrasta", "riflani", "riflana", "suzasti"],
  expanded: ["expanded", "ekspandirani", "ekspandirana", "istegnuti"],
  corrugated: ["corrugated", "trapezni", "trapezna", "valoviti", "valovita"],
};
const PHRASE_NOUNS: Record<string, string[]> = {
  tube: ["tube", "tubes", "tubing", "pipe", "section", "cijev", "cijevi", "cev", "profil"],
  bar: ["bar", "bars", "šipka", "sipka", "šipke", "sipke", "čelik", "celik"],
  sheet: ["sheet", "plate", "metal", "mesh", "lim", "limovi", "ploča", "ploca", "mreža", "mreza"],
};
const PHRASE_TABLE: Record<string, Record<string, string>> = {
  square: { tube: "shs", bar: "sq" },
  rect: { tube: "rhs" },
  round: { tube: "chs", bar: "rnd" },
  flat: { bar: "flt" },
  hollow: { tube: "shs" },
  chequered: { sheet: "chq" },
  expanded: { sheet: "xpm" },
  corrugated: { sheet: "corr" },
};
const PHRASES = new Map<string, string>();
for (const [mod, nouns] of Object.entries(PHRASE_TABLE)) {
  for (const [noun, alias] of Object.entries(nouns)) {
    for (const m of PHRASE_MODIFIERS[mod]) {
      for (const n of PHRASE_NOUNS[noun]) PHRASES.set(`${m} ${n}`, alias);
    }
  }
}
// A box of either shape is routed by its sides, like "box" alone.
for (const m of PHRASE_MODIFIERS.hollow) {
  for (const n of PHRASE_NOUNS.tube) PHRASES.set(`${m} ${n}`, "box");
}
for (const [phrase, alias] of Object.entries({
  "angle iron": "l",
  "l profil": "l",
  "l profile": "l",
  "t profil": "t",
  "t profile": "t",
  "u profil": "upn",
  "u profile": "upn",
  "u channel": "upn",
})) PHRASES.set(phrase, alias);

/** The profile word two adjacent words make together, or null. */
export function findPhraseAlias(first: string, second: string): string | null {
  return PHRASES.get(`${first.toLowerCase()} ${second.toLowerCase()}`) ?? null;
}

/**
 * Words that carry no calculation — "2 pieces *of* hea120", "hea120 6 m
 * *long*", "*nosač* hea120", "*dužina* 6m". Dropped once finished, so they
 * neither fail the line nor show as a word the app didn't understand. Kept
 * short on purpose: a word only goes here when it can never change the answer.
 */
const FILLER_WORDS = new Set([
  "of", "the", "a", "an", "long", "each", "iron", "section", "profile", "beam", "beams",
  "length", "steel", "piece", "pcs", "at",
  "profil", "nosač", "nosac", "nosaci", "nosači", "greda", "dužina", "duzina", "dužine",
  "duzine", "duljina", "čelik", "celik", "čelični", "celicni", "komad", "od", "po", "i",
]);

export function isFillerWord(word: string): boolean {
  return FILLER_WORDS.has(word.toLowerCase());
}

const ALIAS_LOOKUP = new Map<string, CommandAlias>(
  COMMAND_ALIASES.map((a) => [a.alias, a]),
);
for (const [synonym, canonical] of Object.entries(COMMAND_ALIAS_SYNONYMS)) {
  const target = ALIAS_LOOKUP.get(canonical);
  if (target) ALIAS_LOOKUP.set(synonym, target);
}

export const COMMAND_ALIAS_RE = [
  ...COMMAND_ALIASES.map((a) => a.alias),
  ...Object.keys(COMMAND_ALIAS_SYNONYMS),
]
  .sort((a, b) => b.length - a.length)
  .join("|");

/**
 * A size always opens with a digit, so anything else after the alias means the
 * alias was never there: `titanium120` is not a tee called "itanium120". A
 * token that fails this reads as unknown, which is a message the user can act
 * on, instead of a mangled size.
 */
function isSizeRemainder(rest: string): boolean {
  return rest === "" || /^[\d.]/.test(rest);
}

export function findAliasByPrefix(token: string): CommandAlias | null {
  const match = token.match(new RegExp(`^(${COMMAND_ALIAS_RE})(.*)$`));
  if (!match) return null;
  if (!isSizeRemainder(match[2])) return null;
  return ALIAS_LOOKUP.get(match[1]) ?? null;
}

export function findAliasByKey(key: string): CommandAlias | null {
  return ALIAS_LOOKUP.get(key) ?? null;
}

export function findAliasByProfileId(profileId: string): CommandAlias | null {
  // sheet/plate backing profiles both belong to the unified "panel" family
  // (canonical alias: plt) so saved entries round-trip cleanly.
  if (profileId === "sheet" || profileId === "plate") {
    return ALIAS_LOOKUP.get("plt") ?? null;
  }
  // Catalogue angles are what `l` resolves to when the size is rolled.
  if (profileId === "angle_en") {
    return ALIAS_LOOKUP.get("l") ?? null;
  }
  return (
    COMMAND_ALIASES.find(
      (a) => a.profileId === profileId || a.manualProfileId === profileId,
    ) ?? null
  );
}

/** Curated standard sizes per family for the suggestion chips. */
export const COMMAND_SIZES: Record<CommandAlias["fam"], string[]> = {
  beam: ["100", "120", "140", "160", "180", "200", "220", "240", "300"],
  tee: ["30x4", "35x4.5", "40x5", "50x6", "60x7"],
  shs: ["20x20x2", "30x30x3", "40x40x3", "50x50x3", "60x60x4", "80x80x4"],
  rhs: ["40x20x2", "50x30x3", "60x40x3", "80x40x3", "100x50x4", "120x80x4"],
  chs: ["21.3x2.3", "33.7x2.6", "42.4x2.6", "48.3x3.2", "60.3x3.2", "88.9x3.2"],
  round: ["8", "10", "12", "16", "20", "25", "30", "40"],
  sqbar: ["10", "12", "16", "20", "25", "30", "40"],
  flat: ["20x5", "30x5", "40x8", "50x10", "60x8", "80x10"],
  angle: ["30x30x3", "40x40x4", "50x50x5", "60x60x6", "80x80x8"],
  // Natural piece spec: width × length × thickness, all in mm.
  // Sheet/plate are unified — the parser picks the right backing profile
  // (sheet for ≤6 mm, plate for >6 mm) by thickness.
  panel: [
    "1000x2000x1",
    "1250x2500x2",
    "1500x3000x3",
    "1500x3000x6",
    "1500x3000x10",
    "2000x6000x15",
    "2500x6000x20",
  ],
  // width × length × thickness × patternHeight
  chequered: [
    "1500x3000x5x2",
    "1500x3000x6x2",
    "2000x6000x6x2",
  ],
  expanded: ["1000x2000x1", "1250x2500x2", "1500x3000x3"],
  corrugated: ["1000x2000x0.7", "1250x2500x0.7", "1500x3000x0.8"],
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
  "stainless-304": {
    short: "304",
    aliases: [
      "304", "1.4301", "a2", "inox", "stainless",
      "nehrđajući", "nehrdjajuci", "nerđajući", "nerdjajuci", "prohrom",
    ],
  },
  "stainless-316": { short: "316", aliases: ["316", "1.4401"] },
  "stainless-316l": { short: "316L", aliases: ["316l", "1.4404", "a4"] },
  "al-6060": {
    short: "6060",
    aliases: [
      "6060", "al", "alu", "aluminium", "aluminum",
      "aluminij", "aluminijum", "aluminijski", "aluminijska", "aluminijsko",
    ],
  },
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
