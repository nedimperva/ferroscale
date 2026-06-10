import {
  calculateMetal,
  fromMillimeters,
  getProfileById,
  toMillimeters,
  type CalculationInput,
  type DimensionKey,
  type LengthUnit,
} from "@ferroscale/metal-core";
import type { CommandPricing } from "@/lib/settings-stores";
import {
  COMMAND_ALIAS_RE,
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
  CommandTokenKind,
} from "./types";

const LENGTH_RE = /^(\d+(?:\.\d+)?)(mm|cm|m|in|ft)$/;
const BARE_NUMBER_RE = /^\d+(?:\.\d+)?$/;
const QTY_RE = /^[x×*](\d+)$/;

/** Families whose size token bakes the length in (w × l × t for sheets/plates). */
const SHEET_LIKE_FAMILIES = new Set<CommandFamily>([
  "sheet",
  "plate",
  "expanded",
  "corrugated",
  "chequered",
]);

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
    case "sheet":
    case "plate":
    case "expanded":
    case "corrugated":
      // Sheets/plates are spec'd as one piece: width × length × thickness.
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
  options: { defaultGradeId?: string } = {},
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
  } else if (alias.manualProfileId) {
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

  return `${alias.alias}${sizeText}${lengthToken}${qtyToken}${gradeToken}`;
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

  if (!alias.manualProfileId) return null;

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
    // Sheet/plate-like pieces are spec'd as one block (width × length × thickness).
    // Length comes from the size token, not a separate length token.
    case "sheet":
    case "plate":
    case "expanded":
    case "corrugated": {
      const w = dims[0];
      const l = dims[1];
      const t = dims[2];
      if (!w || !l || !t) return null;
      setDim("width", w);
      setDim("thickness", t);
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

  return {
    ...base,
    profileId: alias.manualProfileId,
    manualDimensions,
  };
}

export function cmdParse(
  query: string,
  settings: CommandParserSettings,
): CommandParseResult {
  const toks = (query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);

  let alias: CommandAlias | null = null;
  let size = "";
  let lengthM: number | null = null;
  let lengthRaw: number | null = null;
  let lengthUnit: LengthUnit = settings.defaultLengthUnit;
  let lengthExplicit = false;
  let qty: number | null = null;
  let gradeId: string | null = null;

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
      settings.pricing,
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
      settings.pricing,
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
    pricing: settings.pricing,
  };
}

export function cmdClassifyToken(tok: string): CommandTokenKind {
  const x = tok.toLowerCase();
  if (new RegExp(`^(${COMMAND_ALIAS_RE})`).test(x)) return "profile";
  if (QTY_RE.test(x)) return "qty";
  if (findGradeByAlias(x)) return "grade";
  if (LENGTH_RE.test(x) || BARE_NUMBER_RE.test(x)) return "len";
  return "unknown";
}
