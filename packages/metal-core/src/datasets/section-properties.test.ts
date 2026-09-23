import { describe, it, expect } from "vitest";
import { PROFILE_DEFINITIONS } from "./profiles";
import {
  SECTION_PROPERTIES,
  SECTION_PROPERTIES_UNSOURCED,
  getSectionProperties,
  type SectionProperties,
} from "./section-properties";

/**
 * None of these checks reads a row back against itself: each compares the
 * transcribed figures with something they were not copied from — the size
 * table the engine weighs with, or the section's own geometry. A mistyped
 * digit anywhere in a row breaks at least one of them.
 */

const standardSizes = PROFILE_DEFINITIONS.flatMap((profile) =>
  profile.mode === "standard" ? profile.sizes.map((size) => ({ profile, size })) : [],
);

const rows = Object.entries(SECTION_PROPERTIES);

function within(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected) / expected).toBeLessThanOrEqual(tolerance);
}

/** A parallel-flange I-section from its plate dimensions and root radius (cm). */
function iSectionGeometry(p: SectionProperties) {
  const h = p.hMm / 10, b = p.bMm / 10, tw = p.twMm / 10, tf = p.tfMm / 10, r = p.rMm / 10;
  const hw = h - 2 * tf;
  return {
    area: 2 * b * tf + hw * tw + (4 - Math.PI) * r ** 2,
    iy: (b * h ** 3 - (b - tw) * hw ** 3) / 12 + 0.03 * r ** 4 + 0.2146 * r ** 2 * (hw - 0.4468 * r) ** 2,
    iz: (2 * tf * b ** 3 + hw * tw ** 3) / 12 + 0.03 * r ** 4 + 0.2146 * r ** 2 * (tw + 0.4468 * r) ** 2,
    wply: (tw * h ** 2) / 4 + (b - tw) * (h - tf) * tf + ((4 - Math.PI) / 2) * r ** 2 * hw + ((3 * Math.PI - 10) / 3) * r ** 3,
    wplz: (b ** 2 * tf) / 2 + (hw / 4) * tw ** 2 + r ** 3 * (10 / 3 - Math.PI) + (2 - Math.PI / 2) * tw * r ** 2,
  };
}

describe("section properties", () => {
  it("covers every standard size, or says why not", () => {
    for (const { size } of standardSizes) {
      const covered = size.id in SECTION_PROPERTIES || size.id in SECTION_PROPERTIES_UNSOURCED;
      expect(covered, `${size.id} has no section properties and no reason given`).toBe(true);
    }
    // And nothing here names a size the app does not have.
    const ids = new Set(standardSizes.map(({ size }) => size.id));
    for (const id of [...Object.keys(SECTION_PROPERTIES), ...Object.keys(SECTION_PROPERTIES_UNSOURCED)]) {
      expect(ids.has(id), `${id} is not a standard size`).toBe(true);
    }
  });

  it("describes the same section the size table weighs", () => {
    const areaById = new Map(standardSizes.map(({ size }) => [size.id, size.areaMm2]));
    for (const [id, p] of rows) {
      within(p.areaCm2 * 100, areaById.get(id)!, 0.01);
    }
  });

  it("has elastic moduli that follow from I and the extreme fibre", () => {
    for (const [id, p] of rows) {
      const family = id.replace(/[\d.x]+$/, "");
      const h = p.hMm / 10, b = p.bMm / 10;
      if (family === "t") {
        within(p.iyCm4 / (h - p.eMm! / 10), p.welYCm3, 0.02);
        within(p.izCm4 / (b / 2), p.welZCm3, 0.02);
      } else if (family === "upn" || family === "upe") {
        within(p.iyCm4 / (h / 2), p.welYCm3, 0.005);
        // ys is printed to a millimetre, which is all of the slack here.
        within(p.izCm4 / (b - p.ysMm! / 10), p.welZCm3, 0.02);
      } else {
        // Tapered IPN flanges round a little looser than the parallel families.
        const tolerance = family === "ipn" ? 0.006 : 0.0012;
        within(p.iyCm4 / (h / 2), p.welYCm3, tolerance);
        within(p.izCm4 / (b / 2), p.welZCm3, tolerance);
      }
    }
  });

  it("matches the geometry of every parallel-flange I-section", () => {
    const parallel = rows.filter(([id]) => /^(ipe|hea|heb|hem)\d/.test(id));
    expect(parallel).toHaveLength(77);
    for (const [, p] of parallel) {
      const g = iSectionGeometry(p);
      // A is printed to 0.1 cm², so the smallest sections carry ~0.6% of rounding.
      within(g.area, p.areaCm2, 0.008);
      // The rest are printed to four figures: measured worst case 0.09%, and a slipped digit is well over 0.12%.
      within(g.iy, p.iyCm4, 0.0012);
      within(g.iz, p.izCm4, 0.0012);
      within(g.wply, p.wplYCm3, 0.0012);
      within(g.wplz, p.wplZCm3, 0.0012);
    }
  });

  it("keeps the plastic modulus above the elastic one", () => {
    for (const [, p] of rows) {
      expect(p.wplYCm3).toBeGreaterThan(p.welYCm3);
      expect(p.wplZCm3).toBeGreaterThan(p.welZCm3);
      expect(p.iyCm4).toBeGreaterThan(p.izCm4);
    }
  });

  it("derives radii of gyration rather than storing them", () => {
    const ipe200 = getSectionProperties("ipe200")!;
    // Catalogue: Iy 1943 cm⁴ on A 28.5 cm² prints iy = 8.2 cm (truncated).
    expect(ipe200.iyRadiusCm).toBeCloseTo(8.26, 2);
    expect(getSectionProperties("shs40x40x3")).toBeNull();
    expect(getSectionProperties(undefined)).toBeNull();
  });
});
