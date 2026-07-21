import { calculateMetal } from "../calculator/engine";
import { fromMillimeters, toMillimeters } from "../calculator/units";
import type {
  CalculationInput,
  CalculationResponse,
  LengthUnit,
  PriceBasis,
  PriceUnit,
} from "../calculator/types";
import { getProfileById } from "../datasets/profiles";
import type { DimensionKey, ProfileId } from "../datasets/types";
import {
  COMMAND_ALIAS_RE,
  COMMAND_GRADES,
  findAliasByKey,
  findAliasByProfileId,
  findAliasByPrefix,
  findGradeByAlias,
  findGradeById,
  type CommandGrade,
} from "./aliases";
import type {
  CommandAlias,
  CommandCalc,
  CommandFamily,
  CommandParseIssue,
  CommandParseResult,
  CommandParserSettings,
  CommandPricing,
  CommandTokenKind,
} from "./types";

const LENGTH_RE = /^(\d+(?:\.\d+)?)(mm|cm|m|in|ft)$/;
const BARE_NUMBER_RE = /^\d+(?:\.\d+)?$/;
const QTY_RE = /^[x×*](\d+)$/;
const PRICE_RE = /^@?(\d+(?:[.,]\d+)?)\/(kg|lb|m|ft|pc|pcs|piece)$/;
const PRICE_VALUE_ONLY_RE = /^@(\d+(?:[.,]\d+)?)$/;

const PRICE_UNIT_BASIS: Record<PriceUnit, PriceBasis> = {
  kg: "weight",
  lb: "weight",
  m: "length",
  ft: "length",
  piece: "piece",
};

function normalizePriceUnit(unit: string | undefined): PriceUnit | undefined {
  if (!unit) return undefined;
  if (unit === "pc" || unit === "pcs") return "piece";
  return unit as PriceUnit;
}

function parsePriceToken(token: string): Partial<CommandPricing> | null {
  const explicit = token.match(PRICE_RE);
  const valueOnly = token.match(PRICE_VALUE_ONLY_RE);
  const match = explicit ?? valueOnly;
  if (!match) return null;

  const unitPrice = parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(unitPrice)) return null;

  const priceUnit = normalizePriceUnit(explicit?.[2]);
  if (!priceUnit) return { unitPrice };

  return {
    unitPrice,
    priceUnit,
    priceBasis: PRICE_UNIT_BASIS[priceUnit],
  };
}

/** Families whose size token bakes the length in (w × l × t for panels). */
export const SHEET_LIKE_FAMILIES = new Set<CommandFamily>([
  "panel",
  "expanded",
  "corrugated",
  "chequered",
]);

/** EN convention: sheets are ≤ 6 mm thick, plates are thicker. */
const PLATE_THICKNESS_THRESHOLD_MM = 6;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

/**
 * Per-family conversion of mm dims into the size text Command appends onto
 * the profile token (e.g. {side:40, wallThickness:3} → "40x40x3"). Used by
 * both the suggestion bar (presets) and inputToQuery (saved entries).
 * Returns null when required dimensions are missing.
 */
export function dimsToSizeText(
  fam: CommandFamily,
  d: Partial<Record<DimensionKey, number>>,
  lengthMm?: number,
): string | null {
  switch (fam) {
    case "shs":
      return d.side != null && d.wallThickness != null
        ? `${fmt(d.side)}x${fmt(d.side)}x${fmt(d.wallThickness)}`
        : null;
    case "rhs":
      return d.width != null && d.height != null && d.wallThickness != null
        ? `${fmt(d.width)}x${fmt(d.height)}x${fmt(d.wallThickness)}`
        : null;
    case "chs":
      return d.outerDiameter != null && d.wallThickness != null
        ? `${fmt(d.outerDiameter)}x${fmt(d.wallThickness)}`
        : null;
    case "round":
      return d.diameter != null ? fmt(d.diameter) : null;
    case "sqbar":
      return d.side != null ? fmt(d.side) : null;
    case "flat":
      return d.width != null && d.thickness != null
        ? `${fmt(d.width)}x${fmt(d.thickness)}`
        : null;
    case "angle":
      return d.legA != null && d.legB != null && d.thickness != null
        ? `${fmt(d.legA)}x${fmt(d.legB)}x${fmt(d.thickness)}`
        : null;
    case "panel":
    case "expanded":
    case "corrugated":
      // One-piece spec: width × length × thickness.
      return d.width != null && d.thickness != null && lengthMm != null
        ? `${fmt(d.width)}x${fmt(lengthMm)}x${fmt(d.thickness)}`
        : null;
    case "chequered":
      return d.width != null && d.thickness != null && d.patternHeight != null && lengthMm != null
        ? `${fmt(d.width)}x${fmt(lengthMm)}x${fmt(d.thickness)}x${fmt(d.patternHeight)}`
        : null;
    case "beam":
    case "tee":
      // Standard profiles have no manual dims — caller derives from selectedSizeId.
      return null;
    default:
      return null;
  }
}

/**
 * Inverse of buildCalculationInput. Reconstitutes a Command-style query
 * string from a stored CalculationInput so saved/compare/project entries
 * can be loaded back into the query line.
 *
 * Returns "" when the profile has no Command alias (sheets/plates/tees/etc.) —
 * the caller falls back to the entry's display name.
 */
export function inputToQuery(
  input: CalculationInput,
  defaultUnit: LengthUnit,
  options: { defaultGradeId?: string; defaultPricing?: CommandPricing } = {},
): string {
  const alias = findAliasByProfileId(input.profileId);
  if (!alias) return "";

  const lengthMm = toMillimeters(input.length.value, input.length.unit);

  let sizeText: string | null;
  if (alias.profileId && input.selectedSizeId) {
    // Standard profile — strip the alias prefix off the size id.
    sizeText = input.selectedSizeId.startsWith(alias.alias)
      ? input.selectedSizeId.slice(alias.alias.length)
      : null;
  } else if (alias.manualProfileId || alias.fam === "panel") {
    // Panel has no fixed manualProfileId — the backing profile (sheet/plate)
    // is on input.profileId itself. Other manual families bind via alias.
    const dimsMm: Partial<Record<DimensionKey, number>> = {};
    for (const key of Object.keys(input.manualDimensions) as DimensionKey[]) {
      const entry = input.manualDimensions[key];
      if (!entry) continue;
      dimsMm[key] = toMillimeters(entry.value, entry.unit);
    }
    sizeText = dimsToSizeText(alias.fam, dimsMm, lengthMm);
  } else {
    sizeText = null;
  }
  if (!sizeText) return "";

  // Sheet-like families bake length into the size token; everything else
  // appends a separate length token in the user's default unit.
  const sheetLike = SHEET_LIKE_FAMILIES.has(alias.fam);
  let lengthToken = "";
  if (!sheetLike) {
    const lengthValue = fromMillimeters(lengthMm, defaultUnit);
    lengthToken = ` ${fmt(lengthValue)}${defaultUnit}`;
  }

  const qtyToken = input.quantity > 1 ? ` x${input.quantity}` : "";

  // Grade: omit when it equals the user's default (less noise) or unmapped.
  let gradeToken = "";
  const grade: CommandGrade | null = findGradeById(input.materialGradeId);
  if (grade && grade.id !== options.defaultGradeId) {
    gradeToken = ` ${grade.aliases[0]}`;
  }

  let priceToken = "";
  const defaultPricing = options.defaultPricing;
  if (
    defaultPricing
    && (
      input.unitPrice !== defaultPricing.unitPrice
      || input.priceBasis !== defaultPricing.priceBasis
      || input.priceUnit !== defaultPricing.priceUnit
    )
  ) {
    priceToken = ` @${fmt(input.unitPrice)}/${input.priceUnit}`;
  }

  return `${alias.alias}${sizeText}${lengthToken}${qtyToken}${gradeToken}${priceToken}`;
}

/**
 * Build a CalculationInput for the metal-core engine from a parsed Command query.
 * Returns null when geometry is incomplete (so no result is possible yet).
 */
function buildCalculationInput(
  alias: CommandAlias,
  sizeStr: string,
  lengthMm: number,
  qty: number,
  gradeId: string,
  pricing: CommandPricing,
): CalculationInput | null {
  const dims = sizeStr
    .split(/[x×]/)
    .map((s) => parseFloat(s))
    .filter((n) => !Number.isNaN(n));

  const base = {
    materialGradeId: gradeId,
    useCustomDensity: false,
    length: { value: lengthMm, unit: "mm" as const },
    quantity: qty,
    ...pricing,
    rounding: { weightDecimals: 8, priceDecimals: 2, dimensionDecimals: 4 },
  };

  // Standard EN beams/channels — look up the size id.
  if (alias.profileId) {
    const profile = getProfileById(alias.profileId);
    if (!profile || profile.mode !== "standard") return null;
    // HEA/IPE etc. use single-dim keys ("120"); tees use multi-dim ("30x4").
    const key = dims.length === 0 ? "" : dims.map(fmt).join("x");
    if (!key) return null;
    const targetSizeId = `${alias.alias}${key}`;
    const match = profile.sizes.find((s) => s.id === targetSizeId);
    if (!match) return null;
    return {
      ...base,
      profileId: alias.profileId,
      selectedSizeId: match.id,
      manualDimensions: {},
    };
  }

  // Panel picks its backing profile from thickness at runtime, so it has no
  // fixed manualProfileId. Every other manual family needs one.
  if (alias.fam !== "panel" && !alias.manualProfileId) return null;

  const manualDimensions: Partial<Record<DimensionKey, { value: number; unit: "mm" }>> = {};
  const setDim = (key: DimensionKey, value: number) => {
    manualDimensions[key] = { value, unit: "mm" };
  };

  switch (alias.fam) {
    case "shs": {
      // a x a x t  (3 values) or a x t (2 values)
      const a = dims[0];
      const t = dims.length >= 3 ? dims[2] : dims[1];
      if (!a || !t) return null;
      setDim("side", a);
      setDim("wallThickness", t);
      break;
    }
    case "rhs": {
      const a = dims[0];
      const b = dims[1];
      const t = dims[2];
      if (!a || !b || !t) return null;
      setDim("width", a);
      setDim("height", b);
      setDim("wallThickness", t);
      break;
    }
    case "chs": {
      const d = dims[0];
      const t = dims[1];
      if (!d || !t) return null;
      setDim("outerDiameter", d);
      setDim("wallThickness", t);
      break;
    }
    case "round": {
      const d = dims[0];
      if (!d) return null;
      setDim("diameter", d);
      break;
    }
    case "sqbar": {
      const a = dims[0];
      if (!a) return null;
      setDim("side", a);
      break;
    }
    case "flat": {
      const w = dims[0];
      const t = dims[1];
      if (!w || !t) return null;
      setDim("width", w);
      setDim("thickness", t);
      break;
    }
    case "angle": {
      const a = dims[0];
      const b = dims[1] ?? dims[0];
      const t = dims[2] ?? dims[1];
      if (!a || !b || !t) return null;
      setDim("legA", a);
      setDim("legB", b);
      setDim("thickness", t);
      break;
    }
    // Flat panels (sheets and plates) are spec'd as one block
    // width × length × thickness. We pick the right EN backing profile by
    // thickness so the user never has to choose between "sheet" and "plate".
    case "panel": {
      const w = dims[0];
      const l = dims[1];
      const t = dims[2];
      if (!w || !l || !t) return null;
      setDim("width", w);
      setDim("thickness", t);
      const panelProfileId: ProfileId =
        t <= PLATE_THICKNESS_THRESHOLD_MM ? "sheet" : "plate";
      return {
        ...base,
        profileId: panelProfileId,
        manualDimensions,
        length: { value: l, unit: "mm" },
      };
    }
    case "expanded":
    case "corrugated": {
      const w = dims[0];
      const l = dims[1];
      const t = dims[2];
      if (!w || !l || !t) return null;
      setDim("width", w);
      setDim("thickness", t);
      if (!alias.manualProfileId) return null;
      return {
        ...base,
        profileId: alias.manualProfileId,
        manualDimensions,
        length: { value: l, unit: "mm" },
      };
    }
    case "chequered": {
      const w = dims[0];
      const l = dims[1];
      const t = dims[2];
      const ph = dims[3];
      if (!w || !l || !t || !ph) return null;
      setDim("width", w);
      setDim("thickness", t);
      setDim("patternHeight", ph);
      if (!alias.manualProfileId) return null;
      return {
        ...base,
        profileId: alias.manualProfileId,
        manualDimensions,
        length: { value: l, unit: "mm" },
      };
    }
    default:
      return null;
  }

  if (!alias.manualProfileId) return null;
  return {
    ...base,
    profileId: alias.manualProfileId,
    manualDimensions,
  };
}

// ——— Space-tolerant tokenization ————————————————————————————————————————
//
// Mobile typing glues tokens together ("hea1006m", "6mx2"). cmdTokenize
// splits on whitespace first, then conservatively breaks each glued word
// into recognized pieces. A word is only split when EVERY resulting piece
// is recognized (valid size / length / qty / grade / number); anything
// ambiguous or unknown stays whole so behavior never gets worse than the
// old whitespace-only split.

const PEEL_QTY_RE = /^[x×]\d+/;
// "mm" before "m" so the longest unit wins while peeling.
const PEEL_LENGTH_RE = /^\d+(?:\.\d+)?(?:mm|cm|in|ft|m)/;
const PEEL_PRICE_RE = /^(?:@?\d+(?:[.,]\d+)?\/(?:kg|lb|m|ft|pc|pcs|piece)|@\d+(?:[.,]\d+)?)/;
const PEEL_NUMBER_RE = /^\d+(?:\.\d+)?/;

/** Grade aliases longest-first so "s235jr" beats "s235" during peeling. */
const GRADE_ALIASES_DESC = COMMAND_GRADES.flatMap((g) => g.aliases).sort(
  (a, b) => b.length - a.length,
);

const ALIAS_PREFIX_RE = new RegExp(`^(${COMMAND_ALIAS_RE})`);

/** Dim counts accepted per manual family (mirrors buildCalculationInput). */
const MANUAL_DIM_COUNTS: Partial<Record<CommandFamily, number[]>> = {
  shs: [2, 3],
  rhs: [3],
  chs: [2],
  round: [1],
  sqbar: [1],
  flat: [2],
  angle: [2, 3],
};

const dimsReCache = new Map<number, RegExp>();
function dimsRe(count: number): RegExp {
  let re = dimsReCache.get(count);
  if (!re) {
    re = new RegExp(`^\\d+(?:\\.\\d+)?(?:x\\d+(?:\\.\\d+)?){${count - 1}}$`);
    dimsReCache.set(count, re);
  }
  return re;
}

/**
 * Peel a glued remainder into qty/length/grade/number pieces. Returns null
 * unless the WHOLE string is consumed — partial recognition never splits.
 * Original casing is preserved in the returned pieces.
 */
function peelPieces(rest: string): string[] | null {
  const pieces: string[] = [];
  let s = rest;
  while (s.length > 0) {
    const lower = s.toLowerCase();
    const qm = lower.match(PEEL_QTY_RE);
    if (qm) {
      pieces.push(s.slice(0, qm[0].length));
      s = s.slice(qm[0].length);
      continue;
    }
    const pm = lower.match(PEEL_PRICE_RE);
    if (pm) {
      pieces.push(s.slice(0, pm[0].length));
      s = s.slice(pm[0].length);
      continue;
    }
    // Explicit unit beats a grade alias ("304mm" is a length, "304" a grade)
    // — same precedence the parser applies to spaced tokens.
    const lm = lower.match(PEEL_LENGTH_RE);
    if (lm) {
      pieces.push(s.slice(0, lm[0].length));
      s = s.slice(lm[0].length);
      continue;
    }
    const grade = GRADE_ALIASES_DESC.find((a) => lower.startsWith(a));
    if (grade) {
      pieces.push(s.slice(0, grade.length));
      s = s.slice(grade.length);
      continue;
    }
    const nm = lower.match(PEEL_NUMBER_RE);
    if (nm) {
      pieces.push(s.slice(0, nm[0].length));
      s = s.slice(nm[0].length);
      continue;
    }
    return null;
  }
  return pieces;
}

/**
 * Split a profile-prefixed word ("hea1006m") into profile+size and trailing
 * pieces. Standard profiles validate the head against the real size table
 * and prefer the longest valid head ("hea10006m" → hea1000 + 6m). Manual
 * families (free-form dims) only split when exactly ONE boundary works —
 * ambiguity (flat "40x412m": 40x4+12m vs 40x41+2m) keeps the word whole.
 */
function splitProfileToken(token: string, aliasKey: string): string[] | null {
  const alias = findAliasByKey(aliasKey);
  if (!alias) return null;
  const rest = token.slice(aliasKey.length);
  if (!rest) return null;
  // Sheet-like families bake length into the size token — never split.
  if (SHEET_LIKE_FAMILIES.has(alias.fam)) return null;
  const restNorm = rest.toLowerCase().replace(/×/g, "x");

  if (alias.profileId) {
    const profile = getProfileById(alias.profileId);
    if (!profile || profile.mode !== "standard") return null;
    const sizeIds = new Set(profile.sizes.map((sz) => sz.id));
    if (sizeIds.has(aliasKey + restNorm)) return null; // already a clean size
    for (let i = restNorm.length - 1; i >= 1; i--) {
      if (!sizeIds.has(aliasKey + restNorm.slice(0, i))) continue;
      const tail = peelPieces(token.slice(aliasKey.length + i));
      if (tail) return [token.slice(0, aliasKey.length + i), ...tail];
    }
    return null;
  }

  const counts = MANUAL_DIM_COUNTS[alias.fam];
  if (!counts) return null;
  if (counts.some((k) => dimsRe(k).test(restNorm))) return null; // clean dims
  const splits: string[][] = [];
  for (let i = 1; i < restNorm.length; i++) {
    const head = restNorm.slice(0, i);
    if (!counts.some((k) => dimsRe(k).test(head))) continue;
    const tail = peelPieces(token.slice(aliasKey.length + i));
    if (tail) splits.push([token.slice(0, aliasKey.length + i), ...tail]);
  }
  return splits.length === 1 ? splits[0] : null;
}

function splitGluedToken(token: string): string[] {
  const lower = token.toLowerCase();
  // Already a single recognized token — keep whole.
  if (
    LENGTH_RE.test(lower) ||
    QTY_RE.test(lower) ||
    parsePriceToken(lower) ||
    BARE_NUMBER_RE.test(lower) ||
    findGradeByAlias(lower)
  ) {
    return [token];
  }
  const aliasMatch = lower.match(ALIAS_PREFIX_RE);
  if (aliasMatch) {
    return splitProfileToken(token, aliasMatch[1]) ?? [token];
  }
  const pieces = peelPieces(token);
  return pieces && pieces.length >= 2 ? pieces : [token];
}

// ——— Natural-language normalization ————————————————————————————————————
//
// People (and voice input) say "6 meters", "2 pieces", "hea 120" — spaced
// word forms the strict grammar wouldn't otherwise accept. mergeWordPairs
// folds those adjacent word pairs into canonical tokens BEFORE glue-splitting,
// so the reader is forgiving while the canonical round-trip form (inputToQuery)
// stays untouched. Only fully-committed words merge: the trailing word (when
// the query has no trailing space) is still being typed and is left alone, so
// the chip/inline-input display never rewrites what the caret sits on.

/** Spoken/written length units → canonical abbreviation. EN + common BS.
 *  Includes the bare abbreviations so a spaced "6 m" / "6 mm" also folds. */
const UNIT_WORDS: Record<string, string> = {
  m: "m", mm: "mm", cm: "cm", in: "in", ft: "ft",
  meter: "m", meters: "m", metre: "m", metres: "m",
  metar: "m", metra: "m", metara: "m",
  millimeter: "mm", millimeters: "mm", millimetre: "mm", millimetres: "mm",
  milimetar: "mm", milimetra: "mm", milimetara: "mm",
  centimeter: "cm", centimeters: "cm", centimetre: "cm", centimetres: "cm",
  centimetar: "cm", centimetra: "cm", centimetara: "cm",
  inch: "in", inches: "in",
  foot: "ft", feet: "ft",
};

/** Words that mean "pieces" after a count. EN + common BS/DE. */
const QTY_WORDS = new Set([
  "pc", "pcs", "piece", "pieces",
  "kom", "komad", "komada",
  "stk", "stuck", "stück", "stuecke",
]);

/** A bare number or an x-joined dimension chain ("120", "40x40x3", "60.3x3.2"). */
const SIZE_LIKE_RE = /^\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)*$/;

/**
 * Fold spoken word pairs into canonical tokens. `lastCommitted` is false when
 * the final word is still being typed (no trailing whitespace) — that word is
 * never merged into or rewritten, keeping the inline input stable.
 */
function mergeWordPairs(words: string[], lastCommitted: boolean): string[] {
  const out: string[] = [];
  const n = words.length;
  const committed = (idx: number) => lastCommitted || idx < n - 1;
  let i = 0;
  while (i < n) {
    const w = words[i];
    const next = i + 1 < n ? words[i + 1] : null;
    // A pair may fold only when both words are committed.
    if (next !== null && committed(i) && committed(i + 1)) {
      const wl = w.toLowerCase();
      const nl = next.toLowerCase();
      // "6" "meters" → "6m"
      if (BARE_NUMBER_RE.test(wl) && UNIT_WORDS[nl]) {
        out.push(w + UNIT_WORDS[nl]);
        i += 2;
        continue;
      }
      // "2" "pieces" / "2" "kom" → "x2"
      if (BARE_NUMBER_RE.test(wl) && QTY_WORDS.has(nl)) {
        out.push("x" + w);
        i += 2;
        continue;
      }
      // "x" "2" / "×" "2" → "x2"
      if ((wl === "x" || wl === "×") && BARE_NUMBER_RE.test(nl)) {
        out.push("x" + next);
        i += 2;
        continue;
      }
      // "hea" "120" → "hea120"  (also "l" "50x50x5", "t" "30x4")
      if (findAliasByKey(wl) && SIZE_LIKE_RE.test(nl)) {
        out.push(w + next);
        i += 2;
        continue;
      }
    }
    out.push(w);
    i += 1;
  }
  return out;
}

/**
 * Whitespace split + natural-language folding + conservative glue-splitting.
 * Shared by cmdParse and the UI token chips so parsing and display always
 * agree. Preserves casing.
 */
export function cmdTokenize(query: string): string[] {
  const raw = query || "";
  const words = raw.trim().split(/\s+/).filter(Boolean);
  // The final word is committed only when the query ends in whitespace.
  const lastCommitted = words.length > 0 && /\s$/.test(raw);
  const merged = mergeWordPairs(words, lastCommitted);
  const out: string[] = [];
  for (const word of merged) out.push(...splitGluedToken(word));
  return out;
}

// ——— Typo correction (did-you-mean) ————————————————————————————————————
//
// Optimal string alignment distance (restricted Damerau-Levenshtein): an
// adjacent transposition ("hae"→"hea") counts as one edit — the most common
// typo, which plain Levenshtein scores as two. All strings here are tiny
// (aliases, grade codes, size texts) so the O(mn) table is negligible.

function osaDistance(a: string, b: string): number {
  const m = a.length;
  const k = b.length;
  if (!m) return k;
  if (!k) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(k + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= k; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= k; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][k];
}

// Alias keys ("hea", "shs", "l", …) — recovered from the shared regex so
// there's one source of truth for the alias set.
const ALIAS_KEYS = COMMAND_ALIAS_RE.split("|");
const GRADE_ALIASES_ALL = COMMAND_GRADES.flatMap((g) => g.aliases);

/** Closest candidate within `maxDist` edits, or undefined (exact ≠ typo). */
function nearestFrom(
  word: string,
  candidates: string[],
  maxDist: number,
): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    if (c === word) return undefined;
    const dist = osaDistance(word, c);
    if (dist < bestD) {
      bestD = dist;
      best = c;
    }
  }
  return best !== undefined && bestD <= maxDist ? best : undefined;
}

/** For an unrecognized whole token: a near grade code, or a near alias with
 *  any trailing size kept ("hae120" → "hea120", "s2355" → "s235"). */
function suggestForUnknownToken(tok: string): string | undefined {
  const grade = nearestFrom(tok, GRADE_ALIASES_ALL, 1);
  if (grade) return grade;
  const m = tok.match(/^([a-z]+)(.*)$/);
  if (m) {
    const near = nearestFrom(m[1], ALIAS_KEYS, 1);
    if (near) return near + m[2];
  }
  return undefined;
}

/** For an off-catalog standard size ("hea125"): the nearest real size text.
 *  Manual free-form dims are too ambiguous to guess, so they get nothing. */
function suggestForUnknownSize(
  alias: CommandAlias,
  size: string,
): string | undefined {
  if (!alias.profileId) return undefined;
  const profile = getProfileById(alias.profileId);
  if (!profile || profile.mode !== "standard") return undefined;
  const texts = profile.sizes.map((s) =>
    s.id.startsWith(alias.alias) ? s.id.slice(alias.alias.length) : s.id,
  );
  return nearestFrom(size, texts, 1);
}

export function cmdParse(
  query: string,
  settings: CommandParserSettings,
): CommandParseResult {
  const toks = cmdTokenize(query).map((t) => t.toLowerCase());
  // The trailing token is still being typed unless the query ends with
  // whitespace — never flag it, or every keystroke would raise an issue.
  const lastTokenCommitted = /\s$/.test(query);

  let alias: CommandAlias | null = null;
  let aliasCommitted = false;
  let size = "";
  let lengthM: number | null = null;
  let lengthRaw: number | null = null;
  let lengthUnit: LengthUnit = settings.defaultLengthUnit;
  let lengthExplicit = false;
  let qty: number | null = null;
  let gradeId: string | null = null;
  let pricingOverride: Partial<CommandPricing> | null = null;
  const issues: CommandParseIssue[] = [];

  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    const committed = i < toks.length - 1 || lastTokenCommitted;
    if (!alias) {
      const aliasMatch = tk.match(new RegExp(`^(${COMMAND_ALIAS_RE})(.*)$`));
      if (aliasMatch) {
        const found = findAliasByPrefix(aliasMatch[1]);
        if (found) {
          alias = found;
          aliasCommitted = committed;
          size = aliasMatch[2].replace(/×/g, "x");
          continue;
        }
      }
    }
    const price = parsePriceToken(tk);
    if (price) {
      pricingOverride = { ...(pricingOverride ?? {}), ...price };
      continue;
    }
    const lm = tk.match(LENGTH_RE);
    if (lm && lengthM == null) {
      const v = parseFloat(lm[1]);
      lengthUnit = lm[2] as LengthUnit;
      lengthRaw = v;
      lengthM = toMillimeters(v, lengthUnit) / 1000;
      lengthExplicit = true;
      continue;
    }
    const qm = tk.match(QTY_RE);
    if (qm && qty == null) {
      qty = parseInt(qm[1], 10);
      if (qty < 1) {
        issues.push({
          code: "invalidQty",
          token: tk,
          message: "Quantity must be at least 1.",
        });
      }
      continue;
    }
    // Grade check must precede the bare-number fallback so numeric grade
    // aliases (304, 316, 6060, ...) aren't eaten as lengths. Bare lengths
    // matching a grade alias need an explicit unit (e.g. "304mm").
    const grade = findGradeByAlias(tk);
    if (grade && !gradeId) {
      gradeId = grade.id;
      continue;
    }
    if (BARE_NUMBER_RE.test(tk) && lengthM == null) {
      const v = parseFloat(tk);
      lengthUnit = settings.defaultLengthUnit;
      lengthRaw = v;
      lengthM = toMillimeters(v, lengthUnit) / 1000;
      lengthExplicit = false;
      continue;
    }
    // Fell through every matcher. Duplicates of an already-filled slot keep
    // their token kind and stay silent; genuinely unrecognized input is an issue.
    if (committed && cmdClassifyToken(tk) === "unknown") {
      issues.push({
        code: "unknownToken",
        token: tk,
        message: `Didn't understand "${tk}".`,
        suggestion: suggestForUnknownToken(tk),
      });
    }
  }

  // The typed grade (null when none typed) drives gradeId/gradeLabel so the
  // suggestion bar can still offer the grade stage; the effective grade
  // (typed ?? shared default) drives the actual calculation.
  const typedGrade = gradeId ? findGradeById(gradeId) : null;
  const effectiveGrade = typedGrade ?? findGradeById(settings.defaultGradeId);
  const effectiveGradeId = effectiveGrade?.id ?? settings.defaultGradeId;
  const effectivePricing: CommandPricing = pricingOverride
    ? { ...settings.pricing, ...pricingOverride }
    : settings.pricing;
  const realQty = qty == null ? 1 : qty;
  const hasSize = !!size && /\d/.test(size);

  // Sheet-like families carry length inside the size token (w × l × t).
  // Promote it so the equation line shows the real length and the stage
  // detector skips the "length" suggestion.
  if (alias && SHEET_LIKE_FAMILIES.has(alias.fam) && lengthM == null) {
    const sizeDims = size
      .split(/[x×]/)
      .map((s) => parseFloat(s))
      .filter((n) => !Number.isNaN(n));
    const expected = alias.fam === "chequered" ? 4 : 3;
    if (sizeDims.length === expected) {
      const lMm = sizeDims[1];
      lengthRaw = lMm;
      lengthUnit = "mm";
      lengthM = lMm / 1000;
      lengthExplicit = false;
    }
  }

  let kgm: number | null = null;
  let calc: CommandCalc | null = null;
  let density = effectiveGrade?.density ?? 7850;

  // Only report size/geometry problems once the profile token is committed —
  // "hea1" on the way to "hea120" is progress, not an error.
  const reportGeometry = (input: CalculationInput | null, response: CalculationResponse | null) => {
    if (!aliasCommitted || !alias) return;
    if (!input) {
      issues.push({
        code: "unknownSize",
        token: size,
        message: `No ${alias.name} size "${size}".`,
        params: { profile: alias.name, size },
        suggestion: suggestForUnknownSize(alias, size),
      });
      return;
    }
    if (response && !response.ok) {
      const first = response.issues[0];
      issues.push({
        code: "invalidGeometry",
        token: size,
        message: first?.message ?? "Invalid dimensions.",
        messageKey: first?.messageKey,
        messageValues: first?.messageValues,
      });
    }
  };

  if (alias && hasSize && lengthM != null) {
    const input = buildCalculationInput(
      alias,
      size,
      lengthM * 1000,
      realQty,
      effectiveGradeId,
      effectivePricing,
    );
    const response = input ? calculateMetal(input) : null;
    if (input && response?.ok) {
      calc = { input, result: response.result };
      kgm = response.result.unitWeightKg / lengthM;
      density = response.result.densityKgPerM3;
    } else {
      reportGeometry(input, response);
    }
  } else if (alias && hasSize && lengthM == null) {
    // Compute kg/m even without a length so the equation line can show it.
    const input = buildCalculationInput(
      alias,
      size,
      1000, // 1 m probe
      1,
      effectiveGradeId,
      effectivePricing,
    );
    const response = input ? calculateMetal(input) : null;
    if (input && response?.ok) {
      kgm = response.result.unitWeightKg;
      density = response.result.densityKgPerM3;
    } else {
      reportGeometry(input, response);
    }
  }

  const name = alias
    ? `${alias.name}${hasSize ? " " + size.replace(/x/g, "×") : ""}`
    : null;

  return {
    raw: query,
    alias,
    size,
    hasSize,
    lengthM,
    lengthRaw,
    lengthUnit,
    lengthExplicit,
    qty,
    realQty,
    gradeId: typedGrade?.id ?? null,
    gradeLabel: typedGrade?.label ?? null,
    density,
    kgm,
    calc,
    perPieceKg: calc?.result.unitWeightKg ?? null,
    totalKg: calc?.result.totalWeightKg ?? null,
    totalAmount: calc?.result.grandTotalAmount ?? null,
    selectedSizeId: calc?.input.selectedSizeId ?? null,
    name,
    valid: calc != null,
    issues,
    pricing: effectivePricing,
    priceOverride: pricingOverride
      ? {
          unitPrice: effectivePricing.unitPrice,
          priceBasis: effectivePricing.priceBasis,
          priceUnit: effectivePricing.priceUnit,
        }
      : null,
  };
}

export function cmdClassifyToken(tok: string): CommandTokenKind {
  const x = tok.toLowerCase();
  if (new RegExp(`^(${COMMAND_ALIAS_RE})`).test(x)) return "profile";
  if (QTY_RE.test(x)) return "qty";
  if (parsePriceToken(x)) return "price";
  if (findGradeByAlias(x)) return "grade";
  if (LENGTH_RE.test(x) || BARE_NUMBER_RE.test(x)) return "len";
  return "unknown";
}
