/**
 * Project painting: the surface comes from the items, each coat is its own
 * paint (primer vs finish vs a named extra) with a coverage and a €/kg.
 */

export const PAINT_COAT_KINDS = ["primer", "finish", "custom"] as const;
export type PaintCoatKind = (typeof PAINT_COAT_KINDS)[number];

export interface ProjectPaintCoat {
  id: string;
  kind: PaintCoatKind;
  /** Only stored for a custom coat; primer/finish take their name from i18n. */
  name?: string;
  /** How many times this layer is applied. */
  layers: number;
  coverageM2PerKg: number;
  pricePerKg: number;
}

export interface PaintCoatTotal {
  coat: ProjectPaintCoat;
  kg: number;
  cost: number;
}

export const DEFAULT_PAINT_COVERAGE_M2_PER_KG = 8;
export const DEFAULT_PAINT_PRICE_PER_KG = 8;

export interface PaintDefaults {
  coverageM2PerKg: number;
  pricePerKg: number;
}

export function createPaintCoat(
  kind: PaintCoatKind,
  defaults: PaintDefaults,
  name?: string,
): ProjectPaintCoat {
  return {
    id: crypto.randomUUID(),
    kind,
    name: kind === "custom" ? name?.trim() || undefined : undefined,
    layers: 1,
    coverageM2PerKg: defaults.coverageM2PerKg,
    pricePerKg: defaults.pricePerKg,
  };
}

function asPositive(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function asLayers(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(10, n);
}

export function normalizePaintCoat(raw: unknown): ProjectPaintCoat | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ProjectPaintCoat>;
  const kind = PAINT_COAT_KINDS.includes(candidate.kind as PaintCoatKind)
    ? (candidate.kind as PaintCoatKind)
    : "custom";
  const coverageM2PerKg = asPositive(candidate.coverageM2PerKg, DEFAULT_PAINT_COVERAGE_M2_PER_KG);
  const pricePerKg = asPositive(candidate.pricePerKg, 0);
  if (pricePerKg <= 0 && coverageM2PerKg <= 0) return null;
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID(),
    kind,
    name: candidate.name?.trim() || undefined,
    layers: asLayers(candidate.layers),
    coverageM2PerKg,
    pricePerKg,
  };
}

/**
 * Prefer an explicit coat list. A project saved with the old three scalars
 * (one rate, one coverage, one coat count) becomes a single finish coat.
 */
export function normalizePaintCoats(
  raw: unknown,
  legacy?: {
    paintingPricePerKg?: number;
    paintingCoverageM2PerKg?: number;
    paintingCoats?: number;
  },
): ProjectPaintCoat[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizePaintCoat(entry))
      .filter((coat): coat is ProjectPaintCoat => coat != null)
      .slice(0, 8);
  }
  const price = asPositive(legacy?.paintingPricePerKg, 0);
  if (price <= 0) return [];
  return [
    {
      id: "legacy-finish",
      kind: "finish",
      layers: asLayers(legacy?.paintingCoats),
      coverageM2PerKg: asPositive(
        legacy?.paintingCoverageM2PerKg,
        DEFAULT_PAINT_COVERAGE_M2_PER_KG,
      ),
      pricePerKg: price,
    },
  ];
}

export function projectSurfaceM2(
  calculations: Array<{ result?: { surfaceAreaM2?: number | null } }>,
): number {
  let total = 0;
  for (const calc of calculations) {
    const area = calc.result?.surfaceAreaM2;
    if (area != null && Number.isFinite(area)) total += area;
  }
  return Math.round(total * 100) / 100;
}

export function paintCoatKg(surfaceM2: number, coat: ProjectPaintCoat): number {
  if (surfaceM2 <= 0 || coat.coverageM2PerKg <= 0) return 0;
  return Math.round(((surfaceM2 * coat.layers) / coat.coverageM2PerKg) * 100) / 100;
}

export function paintCoatCost(kg: number, pricePerKg: number): number {
  return Math.round(kg * Math.max(0, pricePerKg) * 100) / 100;
}

export function totalPaint(surfaceM2: number, coats: ProjectPaintCoat[]): {
  coats: PaintCoatTotal[];
  kg: number;
  cost: number;
} {
  const rows = coats.map((coat) => {
    const kg = paintCoatKg(surfaceM2, coat);
    return { coat, kg, cost: paintCoatCost(kg, coat.pricePerKg) };
  });
  return {
    coats: rows,
    kg: Math.round(rows.reduce((sum, row) => sum + row.kg, 0) * 100) / 100,
    cost: Math.round(rows.reduce((sum, row) => sum + row.cost, 0) * 100) / 100,
  };
}
