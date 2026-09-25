import type { StandardProfileDefinition, StandardSizeOption } from "../types";

/**
 * EN 10056-1 hot-rolled angles, one row per catalogue size.
 *
 * Each row is transcribed from a named table: the ArcelorMittal Sections and
 * Merchant Bars 2024-1 sales programme where it lists the size (the same PDF
 * the beam section properties cite, page given per row), otherwise the
 * DIN EN 10056-1 tables on schweizer-fn.de, which also cover the small angles
 * (L 20–40) and the unequal series below 120×80 that the mill does not roll.
 * Where both list a size they agree on A and r1 to the printed digit.
 *
 * Only A, r1 and r2 are data. The painting perimeter is the outline with the
 * root and toe radii rounded off — P = 2(h + b) − (2 − π/2)(r1 + 2·r2) —
 * which lands on the catalogue's AL (m²/m) to its printed three figures, except
 * the 250 and 300 series, whose heel is rounded too (r3) — about 1% less there.
 *
 * Left out on purpose:
 *   · the four sizes ArcelorMittal marks "#", additional to the standard;
 *   · L 100×100×7, 200×200×28, 250×250×27, 250×250×29 — the catalogue prints
 *     their A and G to three figures, and the two roundings land 0.51–0.52%
 *     apart. With no second table to settle them they cannot clear the 0.5%
 *     QA gate honestly, so they stay on the manual formula.
 */

export type AngleSourceId = "arcelormittal-2024" | "schweizer-fn-en-10056";

export interface AngleCatalogRow {
  /** Size id: `l50x5` for equal legs, `l60x40x5` for unequal. */
  id: string;
  /** Long leg h, short leg b, thickness t, root radius r1, toe radius r2 — mm. */
  hMm: number;
  bMm: number;
  tMm: number;
  r1Mm: number;
  r2Mm: number;
  /** Section area as the source prints it, cm². */
  areaCm2: number;
  source: AngleSourceId;
  /** Page of the ArcelorMittal PDF (the file's page index). */
  pdfPage?: number;
}

function angleId(h: number, b: number, t: number): string {
  return h === b ? `l${h}x${t}` : `l${h}x${b}x${t}`;
}

const row = (
  source: AngleSourceId,
  pdfPage: number | undefined,
  h: number,
  b: number,
  t: number,
  r1: number,
  r2: number,
  areaCm2: number,
): AngleCatalogRow => ({
  id: angleId(h, b, t),
  hMm: h,
  bMm: b,
  tMm: t,
  r1Mm: r1,
  r2Mm: r2,
  areaCm2,
  source,
  ...(pdfPage != null ? { pdfPage } : {}),
});

/** ArcelorMittal 2024-1. Pages 104–109 print r1 only; EN 10056-1 fixes r2 = r1 / 2. */
const am = (pdfPage: number, h: number, b: number, t: number, r1: number, r2: number, a: number) =>
  row("arcelormittal-2024", pdfPage, h, b, t, r1, r2, a);
const sfn = (h: number, b: number, t: number, r1: number, r2: number, a: number) =>
  row("schweizer-fn-en-10056", undefined, h, b, t, r1, r2, a);

export const ANGLE_SOURCES: Record<AngleSourceId, { label: string; url: string }> = {
  "arcelormittal-2024": {
    label: "ArcelorMittal, Sections and Merchant Bars — Sales programme 2024-1",
    url: "https://sections.arcelormittal.com/repository2/Sections/Sections_MB_ArcelorMittal_FR_EN_DE.pdf",
  },
  "schweizer-fn-en-10056": {
    label: "DIN EN 10056-1 angle tables (schweizer-fn.de)",
    url: "https://www.schweizer-fn.de/querschnitt/stahlbau/u-t-profile/lgl.php",
  },
};

export const ANGLE_CATALOG: readonly AngleCatalogRow[] = [
  // Equal legs
  sfn(20, 20, 3, 3.5, 1.8, 1.12),
  sfn(25, 25, 3, 3.5, 1.8, 1.42),
  sfn(25, 25, 4, 3.5, 1.8, 1.85),
  sfn(30, 30, 3, 5, 2.5, 1.74),
  sfn(30, 30, 4, 5, 2.5, 2.27),
  sfn(35, 35, 4, 5, 2.5, 2.67),
  sfn(40, 40, 4, 6, 3, 3.08),
  sfn(40, 40, 5, 6, 3, 3.79),
  am(108, 45, 45, 4, 7, 3.5, 3.49),
  sfn(45, 45, 4.5, 7, 3.5, 3.9),
  am(108, 50, 50, 4, 7, 3.5, 3.89),
  am(108, 50, 50, 5, 7, 3.5, 4.8),
  am(108, 50, 50, 6, 7, 3.5, 5.69),
  am(108, 60, 60, 4, 8, 4, 4.71),
  am(108, 60, 60, 5, 8, 4, 5.82),
  am(108, 60, 60, 6, 8, 4, 6.91),
  am(108, 60, 60, 8, 8, 4, 9.03),
  sfn(65, 65, 7, 9, 4.5, 8.7),
  sfn(70, 70, 6, 9, 4.5, 8.13),
  sfn(70, 70, 7, 9, 4.5, 9.4),
  am(108, 75, 75, 4, 9, 4.5, 5.93),
  am(108, 75, 75, 5, 9, 4.5, 7.34),
  am(108, 75, 75, 6, 9, 4.5, 8.73),
  am(108, 75, 75, 7, 9, 4.5, 10.1),
  am(108, 75, 75, 8, 9, 4.5, 11.4),
  am(108, 75, 75, 10, 9, 4.5, 14.1),
  am(108, 80, 80, 5, 10, 5, 7.86),
  am(108, 80, 80, 6, 10, 5, 9.35),
  am(108, 80, 80, 7, 10, 5, 10.8),
  am(108, 80, 80, 8, 10, 5, 12.3),
  am(108, 80, 80, 10, 10, 5, 15.1),
  am(108, 90, 90, 6, 11, 5.5, 10.6),
  am(108, 90, 90, 7, 11, 5.5, 12.2),
  am(108, 90, 90, 8, 11, 5.5, 13.9),
  am(108, 90, 90, 9, 11, 5.5, 15.5),
  am(108, 90, 90, 10, 11, 5.5, 17.1),
  am(108, 90, 90, 11, 11, 5.5, 18.7),
  am(106, 100, 100, 8, 12, 6, 15.5),
  am(106, 100, 100, 10, 12, 6, 19.2),
  am(106, 100, 100, 12, 12, 6, 22.7),
  am(106, 120, 120, 8, 13, 6.5, 18.7),
  am(106, 120, 120, 10, 13, 6.5, 23.2),
  am(106, 120, 120, 11, 13, 6.5, 25.4),
  am(106, 120, 120, 12, 13, 6.5, 27.5),
  am(106, 120, 120, 13, 13, 6.5, 29.7),
  am(106, 120, 120, 15, 13, 6.5, 33.9),
  am(106, 130, 130, 10, 14, 7, 25.2),
  am(106, 130, 130, 11, 14, 7, 27.6),
  am(106, 130, 130, 12, 14, 7, 30),
  am(106, 130, 130, 13, 14, 7, 32.3),
  am(106, 130, 130, 14, 14, 7, 34.7),
  am(106, 130, 130, 15, 14, 7, 37),
  am(106, 130, 130, 16, 14, 7, 39.3),
  am(106, 140, 140, 9, 15, 7.5, 24.6),
  am(106, 140, 140, 10, 15, 7.5, 27.2),
  am(106, 140, 140, 11, 15, 7.5, 29.8),
  am(106, 140, 140, 12, 15, 7.5, 32.4),
  am(106, 140, 140, 13, 15, 7.5, 35),
  am(106, 140, 140, 14, 15, 7.5, 37.5),
  am(106, 140, 140, 15, 15, 7.5, 40),
  am(106, 140, 140, 16, 15, 7.5, 42.5),
  am(106, 140, 140, 18, 15, 7.5, 47.4),
  am(106, 150, 150, 10, 16, 8, 29.3),
  am(106, 150, 150, 12, 16, 8, 34.8),
  am(106, 150, 150, 13, 16, 8, 37.6),
  am(106, 150, 150, 14, 16, 8, 40.3),
  am(106, 150, 150, 15, 16, 8, 43),
  am(106, 150, 150, 16, 16, 8, 45.7),
  am(106, 150, 150, 18, 16, 8, 51),
  am(106, 150, 150, 20, 16, 8, 56.3),
  am(104, 160, 160, 12, 17, 8.5, 37.3),
  am(104, 160, 160, 14, 17, 8.5, 43.2),
  am(104, 160, 160, 15, 17, 8.5, 46.1),
  am(104, 160, 160, 16, 17, 8.5, 49),
  am(104, 160, 160, 17, 17, 8.5, 51.8),
  am(104, 160, 160, 18, 17, 8.5, 54.7),
  am(104, 160, 160, 19, 17, 8.5, 57.5),
  am(104, 160, 160, 20, 17, 8.5, 60.3),
  am(104, 180, 180, 13, 18, 9, 45.5),
  am(104, 180, 180, 14, 18, 9, 48.8),
  am(104, 180, 180, 15, 18, 9, 52.1),
  am(104, 180, 180, 16, 18, 9, 55.4),
  am(104, 180, 180, 17, 18, 9, 58.7),
  am(104, 180, 180, 18, 18, 9, 61.9),
  am(104, 180, 180, 19, 18, 9, 65.1),
  am(104, 180, 180, 20, 18, 9, 68.3),
  am(104, 180, 180, 22, 18, 9, 74.9),
  am(104, 200, 200, 13, 18, 9, 50.7),
  am(104, 200, 200, 15, 18, 9, 58.1),
  am(104, 200, 200, 16, 18, 9, 61.8),
  am(104, 200, 200, 17, 18, 9, 65.5),
  am(104, 200, 200, 18, 18, 9, 69.1),
  am(104, 200, 200, 19, 18, 9, 72.7),
  am(104, 200, 200, 20, 18, 9, 76.3),
  am(104, 200, 200, 21, 18, 9, 79.9),
  am(104, 200, 200, 22, 18, 9, 83.5),
  am(104, 200, 200, 23, 18, 9, 87.1),
  am(104, 200, 200, 24, 18, 9, 90.6),
  am(104, 200, 200, 25, 18, 9, 94.1),
  am(104, 200, 200, 26, 18, 9, 97.6),
  am(102, 250, 250, 17, 18, 9, 82.1),
  am(102, 250, 250, 18, 18, 9, 86.7),
  am(102, 250, 250, 19, 18, 9, 91.4),
  am(102, 250, 250, 20, 18, 9, 96),
  am(102, 250, 250, 21, 18, 9, 101),
  am(102, 250, 250, 22, 18, 9, 105),
  am(102, 250, 250, 23, 18, 9, 110),
  am(102, 250, 250, 24, 18, 9, 114),
  am(102, 250, 250, 25, 18, 9, 119),
  am(102, 250, 250, 26, 18, 9, 123),
  am(102, 250, 250, 28, 18, 9, 133),
  am(102, 250, 250, 30, 18, 9, 141),
  am(102, 250, 250, 31, 18, 9, 145),
  am(102, 250, 250, 32, 18, 9, 150),
  am(102, 250, 250, 33, 18, 9, 154),
  am(102, 250, 250, 34, 18, 9, 158),
  am(102, 250, 250, 35, 18, 9, 163),
  am(102, 300, 300, 27, 18, 12, 154),
  am(102, 300, 300, 28, 18, 12, 159),
  am(102, 300, 300, 29, 18, 12, 165),
  am(102, 300, 300, 30, 18, 12, 170),
  am(102, 300, 300, 31, 18, 12, 175),
  am(102, 300, 300, 32, 18, 12, 181),
  am(102, 300, 300, 33, 18, 12, 186),
  am(102, 300, 300, 34, 18, 12, 191),
  am(102, 300, 300, 35, 18, 12, 197),

  // Unequal legs
  sfn(30, 20, 3, 4, 2, 1.43),
  sfn(30, 20, 4, 4, 2, 1.86),
  sfn(40, 20, 4, 4, 2, 2.26),
  sfn(40, 25, 4, 4, 2, 2.46),
  sfn(45, 30, 4, 4.5, 2.3, 2.87),
  sfn(50, 30, 5, 5, 2.5, 3.78),
  sfn(60, 30, 5, 5, 2.5, 4.28),
  sfn(60, 40, 5, 6, 3, 4.79),
  sfn(60, 40, 6, 6, 3, 5.68),
  sfn(65, 50, 5, 6, 3, 5.54),
  sfn(70, 50, 6, 7, 3.5, 6.89),
  sfn(75, 50, 6, 7, 3.5, 7.19),
  sfn(75, 50, 8, 7, 3.5, 9.41),
  sfn(80, 40, 6, 7, 3.5, 6.89),
  sfn(80, 40, 8, 7, 3.5, 9.01),
  sfn(80, 60, 7, 8, 4, 9.38),
  sfn(100, 50, 6, 8, 4, 8.71),
  sfn(100, 50, 8, 8, 4, 11.4),
  sfn(100, 65, 7, 10, 5, 11.2),
  sfn(100, 65, 8, 10, 5, 12.7),
  sfn(100, 65, 10, 10, 5, 15.6),
  sfn(100, 75, 8, 10, 5, 13.5),
  sfn(100, 75, 10, 10, 5, 16.6),
  sfn(100, 75, 12, 10, 5, 19.7),
  am(110, 120, 80, 8, 11, 5.5, 15.5),
  am(110, 120, 80, 10, 11, 5.5, 19.1),
  am(110, 120, 80, 12, 11, 5.5, 22.7),
  sfn(125, 75, 8, 11, 5.5, 15.5),
  sfn(125, 75, 10, 11, 5.5, 19.1),
  sfn(125, 75, 12, 11, 5.5, 22.7),
  sfn(135, 65, 8, 11, 5.5, 15.5),
  sfn(135, 65, 10, 11, 5.5, 19.1),
  sfn(150, 75, 9, 12, 6, 19.6),
  sfn(150, 75, 10, 12, 6, 21.7),
  sfn(150, 75, 12, 12, 6, 25.7),
  sfn(150, 75, 15, 12, 6, 31.7),
  sfn(150, 90, 10, 12, 6, 23.2),
  sfn(150, 90, 12, 12, 6, 27.5),
  sfn(150, 90, 15, 12, 6, 33.9),
  sfn(150, 100, 10, 12, 6, 24.2),
  sfn(150, 100, 12, 12, 6, 28.7),
  am(110, 200, 100, 10, 15, 7.5, 29.2),
  am(110, 200, 100, 12, 15, 7.5, 34.8),
  am(110, 200, 100, 14, 15, 7.5, 40.3),
  am(110, 200, 100, 15, 15, 7.5, 43),
  sfn(200, 150, 12, 15, 7.5, 40.8),
  sfn(200, 150, 15, 15, 7.5, 50.5),
];

/** Painting perimeter, mm: the sharp outline less what the three radii round off. */
export function anglePerimeterMm(row: AngleCatalogRow): number {
  return 2 * (row.hMm + row.bMm) - (2 - Math.PI / 2) * (row.r1Mm + 2 * row.r2Mm);
}

const byId = new Map(ANGLE_CATALOG.map((r) => [r.id, r]));

export function getAngleCatalogRow(sizeId: string | null | undefined): AngleCatalogRow | null {
  return sizeId ? byId.get(sizeId) ?? null : null;
}

/**
 * The catalogue size an `a × b × t` angle is, in either leg order (a 40×60
 * angle is a 60×40 one lying the other way), or null when it is not rolled.
 */
export function findAngleCatalogSize(a: number, b: number, t: number): AngleCatalogRow | null {
  const h = Math.max(a, b);
  const w = Math.min(a, b);
  return byId.get(angleId(h, w, t)) ?? null;
}

function toSize(r: AngleCatalogRow): StandardSizeOption {
  return {
    id: r.id,
    label: `L ${r.hMm}×${r.bMm}×${r.tMm}`,
    areaMm2: Math.round(r.areaCm2 * 100 * 10) / 10,
    perimeterMm: Math.round(anglePerimeterMm(r)),
    referenceLabel: "EN 10056-1",
  };
}

export const ANGLE_PROFILES: StandardProfileDefinition[] = [
  {
    id: "angle_en",
    label: "Angle (L) EN 10056-1",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10056-1",
    sizes: ANGLE_CATALOG.map(toSize),
  },
];
