import type { CommandParseResult, DimensionKey } from "@ferroscale/metal-core";
import { getStandardProfileSpecRecord, toMillimeters } from "@ferroscale/metal-core";

/**
 * Section geometry for the breakdown drawing. Millimetres come from the same
 * spec records / parsed dims the calculator uses; the SVG just projects them.
 */

export type Pt = { x: number; y: number };

export type Section =
  | { kind: "ibeam" | "channel" | "tee"; h: number; b: number; tw: number; tf: number; r: number }
  | { kind: "box"; b: number; h: number; t: number }
  | { kind: "pipe"; d: number; t: number }
  | { kind: "round"; d: number }
  | { kind: "square"; a: number }
  | { kind: "plate"; w: number; t: number }
  | { kind: "sheet"; w: number; t: number; lengthMm: number; ph?: number }
  | { kind: "angle"; a: number; b: number; t: number }
  | { kind: "chequered"; w: number; t: number; ph: number };

export type PolyRing = { pts: Pt[]; radii: number[] };

export type SectionModel =
  | { kind: "poly"; widthMm: number; heightMm: number; outer: PolyRing; holes: PolyRing[] }
  | {
      kind: "circle";
      widthMm: number;
      heightMm: number;
      cx: number;
      cy: number;
      outerR: number;
      innerR: number | null;
    };

export const FRAME = {
  vbW: 320,
  vbH: 236,
  // Tighter right margin: feature dims now sit on the cut, not in a leader stack.
  margin: { t: 36, r: 58, b: 32, l: 62 },
  minThick: 8,
} as const;

/** Cabinet stub: recedes up-right so the cut stays a true front view. */
export const EXTRUDE = { dx: 26, dy: -16 } as const;

const CIRCLE_SEGS = 40;

function lengthMmOf(p: CommandParseResult): number | null {
  const len = p.calc?.input.length;
  if (len && len.value > 0) {
    const v = toMillimeters(len.value, len.unit);
    return v > 0 ? v : null;
  }
  if (p.lengthM != null && p.lengthM > 0) return p.lengthM * 1000;
  return null;
}

export function resolveSection(p: CommandParseResult): Section | null {
  const input = p.calc?.input;
  if (!input || !p.alias) return null;

  if (input.selectedSizeId) {
    const rec = getStandardProfileSpecRecord(input.profileId, input.selectedSizeId);
    const g = rec?.geometry;
    if (
      rec &&
      g &&
      (rec.drawingKind === "ibeam" || rec.drawingKind === "channel" || rec.drawingKind === "tee")
    ) {
      return {
        kind: rec.drawingKind,
        h: g.heightMm ?? 0,
        b: g.widthMm ?? 0,
        tw: g.webThicknessMm ?? 0,
        tf: g.flangeThicknessMm ?? 0,
        r: g.rootRadiusMm ?? 0,
      };
    }
  }

  const mm = (key: DimensionKey): number | null => {
    const d = input.manualDimensions?.[key];
    if (!d) return null;
    const v = toMillimeters(d.value, d.unit);
    return v > 0 ? v : null;
  };

  switch (p.alias.fam) {
    case "shs": {
      const a = mm("side");
      const t = mm("wallThickness");
      return a != null && t != null ? { kind: "box", b: a, h: a, t } : null;
    }
    case "rhs": {
      const w = mm("width");
      const h = mm("height");
      const t = mm("wallThickness");
      return w != null && h != null && t != null ? { kind: "box", b: w, h, t } : null;
    }
    case "chs": {
      const d = mm("outerDiameter");
      const t = mm("wallThickness");
      return d != null && t != null ? { kind: "pipe", d, t } : null;
    }
    case "round": {
      const d = mm("diameter");
      return d != null ? { kind: "round", d } : null;
    }
    case "sqbar": {
      const a = mm("side");
      return a != null ? { kind: "square", a } : null;
    }
    case "flat": {
      const w = mm("width");
      const t = mm("thickness");
      return w != null && t != null ? { kind: "plate", w, t } : null;
    }
    case "panel": {
      const w = mm("width");
      const t = mm("thickness");
      const lengthMm = lengthMmOf(p);
      return w != null && t != null && lengthMm != null
        ? { kind: "sheet", w, t, lengthMm }
        : w != null && t != null
          ? { kind: "plate", w, t }
          : null;
    }
    case "angle": {
      const a = mm("legA");
      const b = mm("legB");
      const t = mm("thickness");
      return a != null && b != null && t != null ? { kind: "angle", a, b, t } : null;
    }
    case "chequered": {
      const w = mm("width");
      const t = mm("thickness");
      const ph = mm("patternHeight");
      const lengthMm = lengthMmOf(p);
      return w != null && t != null && ph != null && lengthMm != null
        ? { kind: "sheet", w, t, lengthMm, ph }
        : w != null && t != null && ph != null
          ? { kind: "chequered", w, t, ph }
          : null;
    }
    default:
      return null;
  }
}

export function sectionModel(sec: Section): SectionModel {
  switch (sec.kind) {
    case "ibeam": {
      const l = (sec.b - sec.tw) / 2;
      const rr = (sec.b + sec.tw) / 2;
      return {
        kind: "poly",
        widthMm: sec.b,
        heightMm: sec.h,
        outer: {
          pts: [
            p(0, 0),
            p(sec.b, 0),
            p(sec.b, sec.tf),
            p(rr, sec.tf),
            p(rr, sec.h - sec.tf),
            p(sec.b, sec.h - sec.tf),
            p(sec.b, sec.h),
            p(0, sec.h),
            p(0, sec.h - sec.tf),
            p(l, sec.h - sec.tf),
            p(l, sec.tf),
            p(0, sec.tf),
          ],
          radii: [0, 0, 0, sec.r, sec.r, 0, 0, 0, 0, sec.r, sec.r, 0],
        },
        holes: [],
      };
    }
    case "channel":
      return {
        kind: "poly",
        widthMm: sec.b,
        heightMm: sec.h,
        outer: {
          pts: [
            p(0, 0),
            p(sec.b, 0),
            p(sec.b, sec.tf),
            p(sec.tw, sec.tf),
            p(sec.tw, sec.h - sec.tf),
            p(sec.b, sec.h - sec.tf),
            p(sec.b, sec.h),
            p(0, sec.h),
          ],
          radii: [0, 0, 0, sec.r, sec.r, 0, 0, 0],
        },
        holes: [],
      };
    case "tee": {
      const l = (sec.b - sec.tw) / 2;
      const rr = (sec.b + sec.tw) / 2;
      return {
        kind: "poly",
        widthMm: sec.b,
        heightMm: sec.h,
        outer: {
          pts: [
            p(0, 0),
            p(sec.b, 0),
            p(sec.b, sec.tf),
            p(rr, sec.tf),
            p(rr, sec.h),
            p(l, sec.h),
            p(l, sec.tf),
            p(0, sec.tf),
          ],
          radii: [0, 0, 0, sec.r, 0, 0, sec.r, 0],
        },
        holes: [],
      };
    }
    case "box": {
      const t = Math.min(sec.t, sec.b / 2 - 0.01, sec.h / 2 - 0.01);
      return {
        kind: "poly",
        widthMm: sec.b,
        heightMm: sec.h,
        outer: rectRing(0, 0, sec.b, sec.h),
        holes: t > 0 ? [rectRing(t, t, sec.b - 2 * t, sec.h - 2 * t)] : [],
      };
    }
    case "pipe":
      return {
        kind: "circle",
        widthMm: sec.d,
        heightMm: sec.d,
        cx: sec.d / 2,
        cy: sec.d / 2,
        outerR: sec.d / 2,
        innerR: Math.max(0, sec.d / 2 - sec.t),
      };
    case "round":
      return {
        kind: "circle",
        widthMm: sec.d,
        heightMm: sec.d,
        cx: sec.d / 2,
        cy: sec.d / 2,
        outerR: sec.d / 2,
        innerR: null,
      };
    case "square":
      return {
        kind: "poly",
        widthMm: sec.a,
        heightMm: sec.a,
        outer: rectRing(0, 0, sec.a, sec.a),
        holes: [],
      };
    case "plate":
    case "chequered":
      return {
        kind: "poly",
        widthMm: sec.w,
        heightMm: sec.t,
        outer: rectRing(0, 0, sec.w, sec.t),
        holes: [],
      };
    case "sheet":
      return {
        kind: "poly",
        widthMm: sec.w,
        heightMm: sec.t,
        outer: rectRing(0, 0, sec.w, sec.t),
        holes: [],
      };
    case "angle":
      return {
        kind: "poly",
        widthMm: sec.b,
        heightMm: sec.a,
        outer: {
          pts: [
            p(0, 0),
            p(sec.t, 0),
            p(sec.t, sec.a - sec.t),
            p(sec.b, sec.a - sec.t),
            p(sec.b, sec.a),
            p(0, sec.a),
          ],
          radii: [0, 0, 0, 0, 0, 0],
        },
        holes: [],
      };
  }
}

export interface FittedBox {
  x0: number;
  y0: number;
  w: number;
  h: number;
  x1: number;
  y1: number;
  s: number;
  px: (mx: number) => number;
  py: (my: number) => number;
}

/** Fit the true section into the content box, leaving room for the stub. */
export function fitSection(widthMm: number, heightMm: number): FittedBox {
  const { margin, vbW, vbH, minThick } = FRAME;
  const cw = vbW - margin.l - margin.r;
  const ch = vbH - margin.t - margin.b;
  const padX = EXTRUDE.dx;
  const padY = Math.abs(EXTRUDE.dy);
  const usableW = Math.max(24, cw - padX);
  const usableH = Math.max(24, ch - padY);
  const s = Math.min(usableW / widthMm, usableH / heightMm);
  let w = widthMm * s;
  let h = heightMm * s;
  if (h < minThick && w > h) h = Math.min(minThick, usableH);
  if (w < minThick && h > w) w = Math.min(minThick, usableW);
  const x0 = margin.l + (usableW - w) / 2;
  const y0 = margin.t + padY + (usableH - h) / 2;
  return {
    x0,
    y0,
    w,
    h,
    x1: x0 + w,
    y1: y0 + h,
    s,
    px: (mx: number) => x0 + mx * s,
    py: (my: number) => y0 + my * s,
  };
}

export interface SheetLayout {
  x0: number;
  y0: number;
  w: number;
  tPx: number;
  ddx: number;
  ddy: number;
  x1: number;
  y1: number;
}

/** Cabinet layout of a plate: width × length on the face, thickness on the edge. */
export function layoutSheet(widthMm: number, lengthMm: number, thicknessMm: number): SheetLayout {
  const { margin, vbW, vbH } = FRAME;
  const cw = vbW - margin.l - margin.r;
  const ch = vbH - margin.t - margin.b;
  const kx = 0.4;
  const ky = 0.24;
  const tMinPx = 12;
  const s = Math.min(
    cw / (widthMm + lengthMm * kx),
    (ch - tMinPx) / Math.max(lengthMm * ky, 1),
  );
  const w = widthMm * s;
  const ddx = lengthMm * kx * s;
  const ddy = -lengthMm * ky * s;
  const tPx = Math.max(tMinPx, thicknessMm * s);
  const bboxW = w + ddx;
  const bboxH = tPx + Math.abs(ddy);
  const x0 = margin.l + (cw - bboxW) / 2;
  const y0 = margin.t + Math.abs(ddy) + (ch - bboxH) / 2;
  return { x0, y0, w, tPx, ddx, ddy, x1: x0 + w, y1: y0 + tPx };
}

export function mapRing(ring: PolyRing, f: FittedBox): PolyRing {
  return {
    pts: ring.pts.map((pt) => ({ x: f.px(pt.x), y: f.py(pt.y) })),
    radii: ring.radii.map((r) => r * f.s),
  };
}

export function circleToRing(cx: number, cy: number, r: number, segs = CIRCLE_SEGS): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const a = -Math.PI / 2 + (i / segs) * 2 * Math.PI;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** One parallelogram between the external tangents — a smooth cylinder wall. */
export function circleSideBand(cx: number, cy: number, r: number, dx: number, dy: number): SideQuad {
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * r;
  const py = (dx / len) * r;
  return {
    a: { x: cx + px, y: cy + py },
    b: { x: cx - px, y: cy - py },
    bp: { x: cx - px + dx, y: cy - py + dy },
    ap: { x: cx + px + dx, y: cy + py + dy },
    role: "side",
  };
}

/**
 * The visible cylinder wall: tangent sides plus the far half-arcs.
 * Stays outside the cut, so a hollow does not fill with the band.
 */
export function circleWallPath(cx: number, cy: number, r: number, dx: number, dy: number): string {
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * r;
  const py = (dx / len) * r;
  const t1x = cx + px;
  const t1y = cy + py;
  const t2x = cx - px;
  const t2y = cy - py;
  const rr = fmtN(r);
  return [
    `M${fmtN(t1x)},${fmtN(t1y)}`,
    `L${fmtN(t1x + dx)},${fmtN(t1y + dy)}`,
    `A${rr},${rr} 0 0 0 ${fmtN(t2x + dx)},${fmtN(t2y + dy)}`,
    `L${fmtN(t2x)},${fmtN(t2y)}`,
    `A${rr},${rr} 0 0 1 ${fmtN(t1x)},${fmtN(t1y)}`,
    "Z",
  ].join(" ");
}

/** Clockwise rectangle in SVG space (y down). */
export function rectRing(x: number, y: number, w: number, h: number): PolyRing {
  return {
    pts: [p(x, y), p(x + w, y), p(x + w, y + h), p(x, y + h)],
    radii: [0, 0, 0, 0],
  };
}

export function tessellateRounded(ring: PolyRing, arcSteps = 5): Pt[] {
  const { pts, radii } = ring;
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const c = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const r = radii[i] ?? 0;
    if (r <= 0.5) {
      out.push(c);
      continue;
    }
    const v1 = norm(prev.x - c.x, prev.y - c.y);
    const v2 = norm(next.x - c.x, next.y - c.y);
    const rr = Math.min(
      r,
      Math.hypot(prev.x - c.x, prev.y - c.y) / 2,
      Math.hypot(next.x - c.x, next.y - c.y) / 2,
    );
    const t1 = { x: c.x + v1.x * rr, y: c.y + v1.y * rr };
    const t2 = { x: c.x + v2.x * rr, y: c.y + v2.y * rr };
    const cross = v1.x * v2.y - v1.y * v2.x;
    const inward = cross < 0 ? { x: -v1.y, y: v1.x } : { x: v1.y, y: -v1.x };
    const center = { x: t1.x + inward.x * rr, y: t1.y + inward.y * rr };
    const a1 = Math.atan2(t1.y - center.y, t1.x - center.x);
    const a2 = Math.atan2(t2.y - center.y, t2.x - center.x);
    let delta = a2 - a1;
    if (cross < 0 && delta < 0) delta += 2 * Math.PI;
    if (cross >= 0 && delta > 0) delta -= 2 * Math.PI;
    out.push(t1);
    for (let s = 1; s < arcSteps; s++) {
      const a = a1 + (delta * s) / arcSteps;
      out.push({ x: center.x + rr * Math.cos(a), y: center.y + rr * Math.sin(a) });
    }
    out.push(t2);
  }
  return out;
}

export interface SideQuad {
  a: Pt;
  b: Pt;
  bp: Pt;
  ap: Pt;
  /** Horizontal edge → rolled top; vertical → rolled side. */
  role: "top" | "side";
}

/**
 * Cabinet sides that face the camera. Clockwise rings + up-right extrusion
 * keep the top and the right faces; hidden undersides stay undrawn.
 */
export function visibleSideQuads(pts: Pt[], dx: number, dy: number): SideQuad[] {
  const quads: SideQuad[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    if (vx * vx + vy * vy < 2.25) continue;
    const cross = vx * dy - vy * dx;
    if (cross >= -0.2) continue;
    quads.push({
      a,
      b,
      bp: { x: b.x + dx, y: b.y + dy },
      ap: { x: a.x + dx, y: a.y + dy },
      role: Math.abs(vx) >= Math.abs(vy) ? "top" : "side",
    });
  }
  return quads;
}

export function roundedPath(pts: Pt[], radii: number[]): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const c = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const r = radii[i] ?? 0;
    if (r <= 0.5) {
      d += i === 0 ? `M${fmtN(c.x)},${fmtN(c.y)}` : ` L${fmtN(c.x)},${fmtN(c.y)}`;
      continue;
    }
    const v1 = norm(prev.x - c.x, prev.y - c.y);
    const v2 = norm(next.x - c.x, next.y - c.y);
    const rr = Math.min(
      r,
      Math.hypot(prev.x - c.x, prev.y - c.y) / 2,
      Math.hypot(next.x - c.x, next.y - c.y) / 2,
    );
    const t1x = c.x + v1.x * rr;
    const t1y = c.y + v1.y * rr;
    const t2x = c.x + v2.x * rr;
    const t2y = c.y + v2.y * rr;
    const sweep = v1.x * v2.y - v1.y * v2.x < 0 ? 1 : 0;
    d += i === 0 ? `M${fmtN(t1x)},${fmtN(t1y)}` : ` L${fmtN(t1x)},${fmtN(t1y)}`;
    d += ` A${fmtN(rr)},${fmtN(rr)} 0 0 ${sweep} ${fmtN(t2x)},${fmtN(t2y)}`;
  }
  return `${d} Z`;
}

export function polyPath(pts: Pt[]): string {
  return `${pts.map((pt, i) => `${i === 0 ? "M" : "L"}${fmtN(pt.x)},${fmtN(pt.y)}`).join(" ")} Z`;
}

export function quadPath(q: SideQuad): string {
  return `M${fmtN(q.a.x)},${fmtN(q.a.y)} L${fmtN(q.b.x)},${fmtN(q.b.y)} L${fmtN(q.bp.x)},${fmtN(q.bp.y)} L${fmtN(q.ap.x)},${fmtN(q.ap.y)} Z`;
}

export function circleEvenoddPath(cx: number, cy: number, R: number, r: number | null): string {
  const outer =
    `M${fmtN(cx - R)},${fmtN(cy)} a${fmtN(R)},${fmtN(R)} 0 1,0 ${fmtN(2 * R)},0 a${fmtN(R)},${fmtN(R)} 0 1,0 ${fmtN(-2 * R)},0`;
  if (r == null || r <= 0.5) return `${outer} Z`;
  const inner =
    `M${fmtN(cx - r)},${fmtN(cy)} a${fmtN(r)},${fmtN(r)} 0 1,0 ${fmtN(2 * r)},0 a${fmtN(r)},${fmtN(r)} 0 1,0 ${fmtN(-2 * r)},0`;
  return `${outer} ${inner}`;
}

function p(x: number, y: number): Pt {
  return { x, y };
}

function norm(ax: number, ay: number): Pt {
  const m = Math.hypot(ax, ay) || 1;
  return { x: ax / m, y: ay / m };
}

function fmtN(n: number): string {
  return Number(n.toFixed(2)).toString();
}
