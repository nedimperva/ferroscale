import { describe, it, expect } from "vitest";
import { ANGLE_CATALOG, ANGLE_PROFILES, findAngleCatalogSize } from "./angles";

/**
 * EN 10056-1 area from the row's own legs, thickness and radii — not from its
 * printed A — so a slipped digit in either shows up as a disagreement.
 */
function geometricAreaCm2(h: number, b: number, t: number, r1: number, r2: number): number {
  return (t * (h + b - t) + (1 - Math.PI / 4) * (r1 ** 2 - 2 * r2 ** 2)) / 100;
}

describe("EN 10056-1 angle catalogue", () => {
  it("has one row per size", () => {
    const ids = ANGLE_CATALOG.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ANGLE_PROFILES[0].sizes).toHaveLength(ids.length);
  });

  it("prints an area its own geometry agrees with", () => {
    for (const row of ANGLE_CATALOG) {
      const geometric = geometricAreaCm2(row.hMm, row.bMm, row.tMm, row.r1Mm, row.r2Mm);
      const delta = Math.abs(geometric - row.areaCm2) / row.areaCm2;
      // A is printed to three figures (≤0.5% on the heavy sizes); the 250 and
      // 300 series also round the heel (r3), which this formula leaves sharp.
      const tolerance = row.hMm >= 250 ? 0.009 : 0.005;
      expect(delta, `${row.id}: A ${row.areaCm2} vs geometry ${geometric.toFixed(3)}`).toBeLessThanOrEqual(tolerance);
    }
  });

  it("keeps the toe radius at half the root radius", () => {
    // Up to 200: the 250/300 mill series carries its own r2. The DIN table
    // prints r2 to one decimal (1.8 for r1 3.5), hence the half-step slack.
    for (const row of ANGLE_CATALOG.filter((r) => r.hMm <= 200)) {
      expect(Math.abs(row.r2Mm - row.r1Mm / 2), row.id).toBeLessThanOrEqual(0.051);
    }
  });

  it("cites a page for every mill row", () => {
    for (const row of ANGLE_CATALOG) {
      if (row.source === "arcelormittal-2024") expect(row.pdfPage, row.id).toBeGreaterThan(0);
      else expect(row.pdfPage, row.id).toBeUndefined();
    }
  });

  it("finds a size in either leg order, and nothing off-catalogue", () => {
    expect(findAngleCatalogSize(50, 50, 5)?.id).toBe("l50x5");
    expect(findAngleCatalogSize(40, 60, 5)?.id).toBe("l60x40x5");
    expect(findAngleCatalogSize(45, 45, 4.5)?.id).toBe("l45x4.5");
    expect(findAngleCatalogSize(47, 33, 4)).toBeNull();
    // Left out: the catalogue's own A and G disagree past the QA gate.
    expect(findAngleCatalogSize(100, 100, 7)).toBeNull();
  });
});
