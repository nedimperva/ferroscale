import { calculateMetal } from "../calculator/engine";
import { fromMillimeters, toMillimeters } from "../calculator/units";
import type {
  CalculationInput,
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
const SHEET_LIKE_FAMILIES = new Set<CommandFamily>([
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

/**
 * Whitespace split + conservative glue-splitting. Shared by cmdParse and the
 * UI token chips so parsing and display always agree. Preserves casing.
 */
export function cmdTokenize(query: string): string[] {
  const words = (query || "").trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const word of words) out.push(...splitGluedToken(word));
  return out;
}

export function cmdParse(
  query: string,
  settings: CommandParserSettings,
): CommandParseResult {
  const toks = cmdTokenize(query).map((t) => t.toLowerCase());

  let alias: CommandAlias | null = null;
  let size = "";
  let lengthM: number | null = null;
  let lengthRaw: number | null = null;
  let lengthUnit: LengthUnit = settings.defaultLengthUnit;
  let lengthExplicit = false;
  let qty: number | null = null;
  let gradeId: string | null = null;
  let pricingOverride: Partial<CommandPricing> | null = null;

  for (const tk of toks) {
    if (!alias) {
      const aliasMatch = tk.match(new RegExp(`^(${COMMAND_ALIAS_RE})(.*)$`));
      if (aliasMatch) {
        const found = findAliasByPrefix(aliasMatch[1]);
        if (found) {
          alias = found;
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

  if (alias && hasSize && lengthM != null) {
    const input = buildCalculationInput(
      alias,
      size,
      lengthM * 1000,
      realQty,
      effectiveGradeId,
      effectivePricing,
    );
    if (input) {
      const response = calculateMetal(input);
      if (response.ok) {
        calc = { input, result: response.result };
        kgm = response.result.unitWeightKg / lengthM;
        density = response.result.densityKgPerM3;
      }
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
    if (input) {
      const response = calculateMetal(input);
      if (response.ok) {
        kgm = response.result.unitWeightKg;
        density = response.result.densityKgPerM3;
      }
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
