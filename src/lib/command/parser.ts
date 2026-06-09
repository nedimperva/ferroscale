import {
  calculateMetal,
  getProfileById,
  type CalculationInput,
  type DimensionKey,
} from "@ferroscale/metal-core";
import {
  COMMAND_ALIAS_RE,
  findAliasByPrefix,
  findGradeByAlias,
  findGradeById,
} from "./aliases";
import type {
  CommandAlias,
  CommandParseResult,
  CommandSettings,
  CommandTokenKind,
} from "./types";

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
  density: number,
): CalculationInput | null {
  const dims = sizeStr
    .split(/[x×]/)
    .map((s) => parseFloat(s))
    .filter((n) => !Number.isNaN(n));

  // Standard EN beams/channels — look up the size id.
  if (alias.profileId) {
    const profile = getProfileById(alias.profileId);
    if (!profile || profile.mode !== "standard") return null;
    const key = String(dims[0] ?? "");
    if (!key) return null;
    const targetSizeId = `${alias.alias}${key}`;
    const match = profile.sizes.find((s) => s.id === targetSizeId);
    if (!match) return null;
    return {
      materialGradeId: gradeId,
      useCustomDensity: false,
      profileId: alias.profileId,
      selectedSizeId: match.id,
      manualDimensions: {},
      length: { value: lengthMm, unit: "mm" },
      quantity: qty,
      priceBasis: "weight",
      priceUnit: "kg",
      unitPrice: 0,
      currency: "EUR",
      wastePercent: 0,
      includeVat: false,
      vatPercent: 0,
      rounding: { weightDecimals: 8, priceDecimals: 2, dimensionDecimals: 4 },
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
    default:
      return null;
  }

  return {
    materialGradeId: gradeId,
    useCustomDensity: density !== 7850 && density !== 8000 && density !== 2700,
    customDensityKgPerM3: density,
    profileId: alias.manualProfileId,
    manualDimensions,
    length: { value: lengthMm, unit: "mm" },
    quantity: qty,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 0,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: { weightDecimals: 8, priceDecimals: 2, dimensionDecimals: 4 },
  };
}

export function cmdParse(query: string, settings: CommandSettings): CommandParseResult {
  const toks = (query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);

  let alias: CommandAlias | null = null;
  let size = "";
  let lengthM: number | null = null;
  let lengthRaw: number | null = null;
  let lengthUnit: "mm" | "cm" | "m" = "m";
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
    const lm = tk.match(/^([\d.]+)(mm|cm|m)$/);
    if (lm && lengthM == null) {
      const v = parseFloat(lm[1]);
      lengthUnit = lm[2] as "mm" | "cm" | "m";
      lengthRaw = v;
      lengthM = lengthUnit === "mm" ? v / 1000 : lengthUnit === "cm" ? v / 100 : v;
      continue;
    }
    const qm = tk.match(/^[x×*](\d+)$/);
    if (qm && qty == null) {
      qty = parseInt(qm[1], 10);
      continue;
    }
    const grade = findGradeByAlias(tk);
    if (grade && !gradeId) {
      gradeId = grade.id;
      continue;
    }
  }

  const grade = gradeId
    ? findGradeById(gradeId)
    : findGradeById(settings.defaultGradeId);
  const density = grade?.density ?? settings.density;
  const realQty = qty == null ? 1 : qty;
  const hasSize = !!size && /\d/.test(size);

  let kgm: number | null = null;
  let perPieceKg: number | null = null;
  let totalKg: number | null = null;
  let totalEur: number | null = null;
  let selectedSizeId: string | null = null;

  if (alias && hasSize && lengthM != null) {
    const lengthMm = lengthM * 1000;
    const input = buildCalculationInput(
      alias,
      size,
      lengthMm,
      realQty,
      grade?.id ?? settings.defaultGradeId,
      density,
    );
    if (input) {
      const response = calculateMetal(input);
      if (response.ok) {
        totalKg = response.result.totalWeightKg;
        perPieceKg = response.result.unitWeightKg;
        kgm = perPieceKg / lengthM;
        totalEur = totalKg * settings.rate;
        selectedSizeId = input.selectedSizeId ?? null;
      }
    }
  } else if (alias && hasSize && lengthM == null) {
    // Compute kg/m even without a length so the equation line can show it.
    const input = buildCalculationInput(
      alias,
      size,
      1000, // 1 m
      1,
      grade?.id ?? settings.defaultGradeId,
      density,
    );
    if (input) {
      const response = calculateMetal(input);
      if (response.ok) {
        kgm = response.result.unitWeightKg;
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
    qty,
    realQty,
    gradeId: grade?.id ?? null,
    gradeLabel: grade?.label ?? null,
    density,
    kgm,
    perPieceKg,
    totalKg,
    totalEur,
    selectedSizeId,
    name,
    valid: totalKg != null,
    rate: settings.rate,
  };
}

export function cmdClassifyToken(tok: string): CommandTokenKind {
  const x = tok.toLowerCase();
  if (new RegExp(`^(${COMMAND_ALIAS_RE})`).test(x)) return "profile";
  if (/^[x×*]\d+$/.test(x)) return "qty";
  if (/^[\d.]+(mm|cm|m)$/.test(x)) return "len";
  if (findGradeByAlias(x)) return "grade";
  return "unknown";
}
