import type { DimensionKey, ProfileId } from "@/lib/datasets/types";

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export interface ReverseResult {
  ok: true;
  solvedDimension: DimensionKey;
  valueMm: number;
  requiredAreaMm2: number;
}

export interface ReverseError {
  ok: false;
  message: string;
  messageKey?: string;
  messageValues?: Record<string, string | number>;
}

export type ReverseResponse = ReverseResult | ReverseError;

/**
 * Given a target total weight (kg), material density, length (mm), quantity,
 * waste%, and the known dimensions, solve for the unknown dimension.
 *
 * Returns the value in mm for the solved dimension.
 */
export function solveForDimension(params: {
  profileId: ProfileId;
  targetWeightKg: number;
  densityKgPerM3: number;
  lengthMm: number;
  quantity: number;
  wastePercent: number;
  /** The dimension the user wants to solve for. */
  solveDimension: DimensionKey;
  /** Known dimension values in mm. */
  knownDimensions: Partial<Record<DimensionKey, number>>;
}): ReverseResponse {
  const {
    profileId,
    targetWeightKg,
    densityKgPerM3,
    lengthMm,
    quantity,
    wastePercent,
    solveDimension,
    knownDimensions,
  } = params;

  if (targetWeightKg <= 0) {
    return {
      ok: false,
      message: "Target weight must be positive.",
      messageKey: "reverseErrors.targetWeight",
    };
  }
  if (densityKgPerM3 <= 0) {
    return {
      ok: false,
      message: "Density must be positive.",
      messageKey: "reverseErrors.density",
    };
  }
  if (lengthMm <= 0) {
    return {
      ok: false,
      message: "Length must be positive.",
      messageKey: "reverseErrors.length",
    };
  }
  if (quantity <= 0) {
    return {
      ok: false,
      message: "Quantity must be positive.",
      messageKey: "reverseErrors.quantity",
    };
  }

  /* Weight per piece before waste */
  const wasteMultiplier = 1 + wastePercent / 100;
  const totalWeightBeforeWaste = targetWeightKg / wasteMultiplier;
  const unitWeightKg = totalWeightBeforeWaste / quantity;

  /* Required cross-section area (mm²) */
  /* unitWeight = (areaMm2 * lengthMm / 1e9) * density */
  const requiredAreaMm2 = (unitWeightKg * 1_000_000_000) / (lengthMm * densityKgPerM3);

  if (requiredAreaMm2 <= 0 || !Number.isFinite(requiredAreaMm2)) {
    return {
      ok: false,
      message: "Cannot compute a valid cross-section area from these inputs.",
      messageKey: "reverseErrors.invalidArea",
    };
  }

  const solved = solveProfileDimension(profileId, requiredAreaMm2, solveDimension, knownDimensions);
  if (solved === null) {
    return {
      ok: false,
      message: `Cannot solve for ${solveDimension} with the given profile and known dimensions.`,
      messageKey: "reverseErrors.cannotSolve",
      messageValues: { dimension: solveDimension },
    };
  }
  if (solved <= 0 || !Number.isFinite(solved)) {
    return {
      ok: false,
      message: "No valid positive solution exists for these inputs.",
      messageKey: "reverseErrors.noSolution",
    };
  }

  return { ok: true, solvedDimension: solveDimension, valueMm: solved, requiredAreaMm2 };
}

/* ------------------------------------------------------------------ */
/*  Per-profile inverse formulas                                      */
/* ------------------------------------------------------------------ */

function solveProfileDimension(
  profileId: ProfileId,
  areaMm2: number,
  solveDim: DimensionKey,
  known: Partial<Record<DimensionKey, number>>,
): number | null {
  const A = areaMm2;

  switch (profileId) {
    /* ── Round Bar: A = π·d²/4  →  d = √(4A/π) ── */
    case "round_bar": {
      if (solveDim !== "diameter") return null;
      return Math.sqrt((4 * A) / Math.PI);
    }

    /* ── Square Bar: A = a²  →  a = √A ── */
    case "square_bar": {
      if (solveDim !== "side") return null;
      return Math.sqrt(A);
    }

    /* ── Flat Bar / Sheet / Plate / Expanded / Corrugated: A = w × t ── */
    case "flat_bar":
    case "sheet":
    case "plate":
    case "expanded_metal":
    case "corrugated_sheet": {
      if (solveDim === "width") {
        const t = known.thickness;
        if (!t || t <= 0) return null;
        return A / t;
      }
      if (solveDim === "thickness") {
        const w = known.width;
        if (!w || w <= 0) return null;
        return A / w;
      }
      return null;
    }

    /* ── Chequered Plate: A = w × (t + p × 0.5) ── */
    case "chequered_plate": {
      if (solveDim === "width") {
        const t = known.thickness;
        const p = known.patternHeight;
        if (t == null || p == null) return null;
        const denom = t + p * 0.5;
        if (denom <= 0) return null;
        return A / denom;
      }
      if (solveDim === "thickness") {
        const w = known.width;
        const p = known.patternHeight;
        if (w == null || w <= 0 || p == null) return null;
        return A / w - p * 0.5;
      }
      if (solveDim === "patternHeight") {
        const w = known.width;
        const t = known.thickness;
        if (w == null || w <= 0 || t == null) return null;
        return (A / w - t) * 2;
      }
      return null;
    }

    /* ── Pipe: A = π(OD²−ID²)/4, ID = OD−2t ── */
    /* Expanded: A = π·t·(OD − t) */
    case "pipe": {
      if (solveDim === "wallThickness") {
        const OD = known.outerDiameter;
        if (!OD || OD <= 0) return null;
        /* A = π·t·(OD − t)  →  π·t² − π·OD·t + A = 0 */
        const a = Math.PI;
        const b = -Math.PI * OD;
        const c = A;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        /* Take the smaller root (wall thickness < OD/2) */
        const t1 = (-b - Math.sqrt(disc)) / (2 * a);
        const t2 = (-b + Math.sqrt(disc)) / (2 * a);
        const t = (t1 > 0 && t1 < OD / 2) ? t1 : (t2 > 0 && t2 < OD / 2) ? t2 : null;
        return t;
      }
      if (solveDim === "outerDiameter") {
        const t = known.wallThickness;
        if (!t || t <= 0) return null;
        /* A = π·t·(OD − t) → OD = A/(π·t) + t */
        const OD = A / (Math.PI * t) + t;
        return OD > 2 * t ? OD : null;
      }
      return null;
    }

    /* ── Rectangular Tube: A = W·H − (W−2t)(H−2t) = 2t(W + H − 2t) ── */
    case "rectangular_tube": {
      if (solveDim === "wallThickness") {
        const W = known.width;
        const H = known.height;
        if (!W || !H || W <= 0 || H <= 0) return null;
        /* A = 2t(W + H − 2t)  →  4t² − 2(W+H)t + A = 0 */
        const a = 4;
        const b = -2 * (W + H);
        const c = A;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t1 = (-b - Math.sqrt(disc)) / (2 * a);
        const t2 = (-b + Math.sqrt(disc)) / (2 * a);
        const maxT = Math.min(W, H) / 2;
        const t = (t1 > 0 && t1 < maxT) ? t1 : (t2 > 0 && t2 < maxT) ? t2 : null;
        return t;
      }
      if (solveDim === "width") {
        const H = known.height;
        const t = known.wallThickness;
        if (!H || !t || H <= 0 || t <= 0) return null;
        /* A = W·H − (W−2t)(H−2t) = 2t·W + 2t·H − 4t²  →  W = (A − 2tH + 4t²) / (2t) */
        const W = (A - 2 * t * H + 4 * t * t) / (2 * t);
        return W > 2 * t ? W : null;
      }
      if (solveDim === "height") {
        const W = known.width;
        const t = known.wallThickness;
        if (!W || !t || W <= 0 || t <= 0) return null;
        const H = (A - 2 * t * W + 4 * t * t) / (2 * t);
        return H > 2 * t ? H : null;
      }
      return null;
    }

    /* ── Square Hollow: A = a² − (a−2t)² = 4t(a − t) ── */
    case "square_hollow": {
      if (solveDim === "wallThickness") {
        const s = known.side;
        if (!s || s <= 0) return null;
        /* A = 4t(a − t) → 4t² − 4a·t + A = 0 */
        const a = 4;
        const b = -4 * s;
        const c = A;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t1 = (-b - Math.sqrt(disc)) / (2 * a);
        const t2 = (-b + Math.sqrt(disc)) / (2 * a);
        const maxT = s / 2;
        const t = (t1 > 0 && t1 < maxT) ? t1 : (t2 > 0 && t2 < maxT) ? t2 : null;
        return t;
      }
      if (solveDim === "side") {
        const t = known.wallThickness;
        if (!t || t <= 0) return null;
        /* A = 4t(a − t) → a = A/(4t) + t */
        const s = A / (4 * t) + t;
        return s > 2 * t ? s : null;
      }
      return null;
    }

    /* ── Angle (L): A = (a + b − t) × t ── */
    case "angle": {
      if (solveDim === "legA") {
        const b = known.legB;
        const t = known.thickness;
        if (!b || !t || b <= 0 || t <= 0) return null;
        /* A = (a + b − t)·t  →  a = A/t − b + t */
        const a = A / t - b + t;
        return a > 0 ? a : null;
      }
      if (solveDim === "legB") {
        const a = known.legA;
        const t = known.thickness;
        if (!a || !t || a <= 0 || t <= 0) return null;
        /* A = (a + b − t)·t  →  b = A/t − a + t */
        const b = A / t - a + t;
        return b > 0 ? b : null;
      }
      if (solveDim === "thickness") {
        const a = known.legA;
        const b = known.legB;
        if (!a || !b || a <= 0 || b <= 0) return null;
        /* A = (a + b − t)·t  →  t² − (a+b)t + A = 0 */
        const sum = a + b;
        const disc = sum * sum - 4 * A;
        if (disc < 0) return null;
        /* Take the smaller root (thickness < shorter leg) */
        const t1 = (sum - Math.sqrt(disc)) / 2;
        const t2 = (sum + Math.sqrt(disc)) / 2;
        const maxT = Math.min(a, b);
        const t = (t1 > 0 && t1 < maxT) ? t1 : (t2 > 0 && t2 < maxT) ? t2 : null;
        return t;
      }
      return null;
    }

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helper: list solvable dimensions for a manual profile             */
/* ------------------------------------------------------------------ */

/** Returns the dimension keys that can be reverse-solved for a given profile. */
export function getSolvableDimensions(profileId: ProfileId): DimensionKey[] {
  switch (profileId) {
    case "round_bar":
      return ["diameter"];
    case "square_bar":
      return ["side"];
    case "flat_bar":
    case "sheet":
    case "plate":
    case "expanded_metal":
    case "corrugated_sheet":
      return ["width", "thickness"];
    case "chequered_plate":
      return ["width", "thickness", "patternHeight"];
    case "pipe":
      return ["outerDiameter", "wallThickness"];
    case "rectangular_tube":
      return ["width", "height", "wallThickness"];
    case "square_hollow":
      return ["side", "wallThickness"];
    case "angle":
      return ["legA", "legB", "thickness"];
    default:
      return [];
  }
}
