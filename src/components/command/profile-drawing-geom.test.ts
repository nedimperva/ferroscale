import { describe, expect, it } from "vitest";
import { cmdParse } from "@ferroscale/metal-core";
import type { CommandParserSettings, CommandPricing } from "@ferroscale/metal-core";
import {
  EXTRUDE,
  circleSideBand,
  circleToRing,
  circleWallPath,
  fitSection,
  layoutSheet,
  resolveSection,
  sectionModel,
  tessellateRounded,
  visibleSideQuads,
} from "./profile-drawing-geom";

const PRICING: CommandPricing = {
  priceBasis: "weight",
  priceUnit: "kg",
  unitPrice: 1.2,
  currency: "EUR",
  wastePercent: 0,
  includeVat: false,
  vatPercent: 0,
};

const SETTINGS: CommandParserSettings = {
  pricing: PRICING,
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

describe("resolveSection", () => {
  it("reads HEA geometry from the spec record", () => {
    const p = cmdParse("hea200 6m", SETTINGS);
    expect(p.valid).toBe(true);
    const sec = resolveSection(p);
    expect(sec?.kind).toBe("ibeam");
    if (sec?.kind !== "ibeam") return;
    expect(sec.h).toBeGreaterThan(0);
    expect(sec.b).toBeGreaterThan(0);
    expect(sec.tw).toBeGreaterThan(0);
    expect(sec.tf).toBeGreaterThan(0);
  });

  it("reads a manual SHS as a hollow box", () => {
    const p = cmdParse("shs80x80x4 3m", SETTINGS);
    const sec = resolveSection(p);
    expect(sec?.kind).toBe("box");
    if (sec?.kind !== "box") return;
    expect(sec.b).toBe(80);
    expect(sec.t).toBe(4);
    const model = sectionModel(sec);
    expect(model.kind).toBe("poly");
    if (model.kind !== "poly") return;
    expect(model.holes).toHaveLength(1);
  });

  it("reads a plate as a thin rectangle", () => {
    const p = cmdParse("flt200x10 2m", SETTINGS);
    const sec = resolveSection(p);
    expect(sec?.kind).toBe("plate");
  });

  it("reads a panel as a sheet with width, length and thickness", () => {
    const p = cmdParse("plt1500x3000x6", SETTINGS);
    const sec = resolveSection(p);
    expect(sec?.kind).toBe("sheet");
    if (sec?.kind !== "sheet") return;
    expect(sec.w).toBe(1500);
    expect(sec.t).toBe(6);
    expect(sec.lengthMm).toBe(3000);
  });

  it("returns null for an incomplete line", () => {
    const p = cmdParse("hea", SETTINGS);
    expect(resolveSection(p)).toBeNull();
  });
});

describe("cabinet extrusion", () => {
  it("recedes up and to the right", () => {
    expect(EXTRUDE.dx).toBeGreaterThan(0);
    expect(EXTRUDE.dy).toBeLessThan(0);
  });

  it("keeps the top and right faces of a clockwise rectangle", () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 20 },
      { x: 0, y: 20 },
    ];
    const quads = visibleSideQuads(rect, EXTRUDE.dx, EXTRUDE.dy);
    const roles = quads.map((q) => q.role).sort();
    expect(roles).toEqual(["side", "top"]);
    expect(quads).toHaveLength(2);
  });

  it("extrudes a circle into a band of sides, not a disc", () => {
    const ring = circleToRing(0, 0, 10, 24);
    const quads = visibleSideQuads(ring, EXTRUDE.dx, EXTRUDE.dy);
    expect(quads.length).toBeGreaterThan(6);
    expect(quads.length).toBeLessThan(ring.length);
  });

  it("builds one tangent band for a smooth cylinder wall", () => {
    const band = circleSideBand(0, 0, 10, EXTRUDE.dx, EXTRUDE.dy);
    expect(band.role).toBe("side");
    expect(Math.hypot(band.ap.x - band.a.x, band.ap.y - band.a.y)).toBeCloseTo(
      Math.hypot(EXTRUDE.dx, EXTRUDE.dy),
      5,
    );
    const wall = circleWallPath(0, 0, 10, EXTRUDE.dx, EXTRUDE.dy);
    expect(wall.startsWith("M")).toBe(true);
    expect(wall).toContain("A");
    expect(wall.endsWith("Z")).toBe(true);
  });

  it("leaves room for the stub inside the frame", () => {
    const f = fitSection(200, 200);
    expect(f.w + EXTRUDE.dx).toBeLessThanOrEqual(320 - 50);
    expect(f.y0 + EXTRUDE.dy).toBeGreaterThan(0);
  });

  it("lays a sheet out with length on the face, not a stub", () => {
    const L = layoutSheet(1500, 3000, 6);
    expect(L.w).toBeGreaterThan(L.tPx);
    expect(Math.abs(L.ddx)).toBeGreaterThan(L.w * 0.5);
    expect(L.ddy).toBeLessThan(0);
  });

  it("tessellates a fillet into more than one point", () => {
    const pts = tessellateRounded({
      pts: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      radii: [0, 3, 0, 0],
    });
    expect(pts.length).toBeGreaterThan(4);
  });
});
