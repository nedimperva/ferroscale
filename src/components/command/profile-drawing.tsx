import type { CommandParseResult, DimensionKey } from "@ferroscale/metal-core";
import { getStandardProfileSpecRecord, toMillimeters } from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";

/**
 * A scaled, fully-dimensioned cross-section of the current profile — the flat
 * glyph upgraded into an engineering drawing that labels every dimension in mm
 * directly on the picture: overall width/height with arrowheaded dimension
 * lines, and each thickness (web, flange, wall, root radius, …) with a leader
 * pointing at the feature it measures. Standard profiles (I-beams, channels,
 * tees) take their geometry from the shared spec records; manual families from
 * the parsed dimensions. Expanded/corrugated fall back to the plain glyph.
 */

type Section =
  | { kind: "ibeam" | "channel" | "tee"; h: number; b: number; tw: number; tf: number; r: number }
  | { kind: "box"; b: number; h: number; t: number }
  | { kind: "pipe"; d: number; t: number }
  | { kind: "round"; d: number }
  | { kind: "square"; a: number }
  | { kind: "plate"; w: number; t: number }
  | { kind: "angle"; a: number; b: number; t: number }
  | { kind: "chequered"; w: number; t: number; ph: number };

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

function resolveSection(p: CommandParseResult): Section | null {
  const input = p.calc?.input;
  if (!input || !p.alias) return null;

  // Standard profiles carry their real section geometry in the spec records.
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

  // Resolved manual dimension in mm, or null when missing/non-positive.
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
    case "flat":
    case "panel": {
      const w = mm("width");
      const t = mm("thickness");
      return w != null && t != null ? { kind: "plate", w, t } : null;
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
      return w != null && t != null && ph != null ? { kind: "chequered", w, t, ph } : null;
    }
    default:
      return null; // beam handled above; expanded/corrugated → glyph fallback
  }
}

/* ── SVG frame & primitives ──────────────────────────────────────────────── */

const VB_W = 320;
const VB_H = 236;
// Room around the shape for the dimension lines and leader labels.
const M = { t: 34, r: 94, b: 22, l: 54 };
const CW = VB_W - M.l - M.r;
const CH = VB_H - M.t - M.b;
const MIN_THICK = 8; // keep very thin sections/walls visible

const DIM = "var(--muted)";
const TXT = "var(--foreground-secondary)";
const MONO = "var(--font-mono, ui-monospace, monospace)";
const FONT = 11.5;

const SHAPE = {
  fill: "var(--accent-surface)",
  stroke: "var(--accent)",
  strokeWidth: 1.7,
} as const;

/** Fit a real mm bounding box into the content area; returns mm→px mappers and
 *  the shape's pixel rect. Aspect ratio is preserved (both axes share a scale). */
function fitBox(bw: number, bh: number) {
  const s = Math.min(CW / bw, CH / bh);
  let w = bw * s;
  let h = bh * s;
  if (h < MIN_THICK && w > h) h = Math.min(MIN_THICK, CH);
  if (w < MIN_THICK && h > w) w = Math.min(MIN_THICK, CW);
  const x0 = M.l + (CW - w) / 2;
  const y0 = M.t + (CH - h) / 2;
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

/** Build a closed path through `pts`, rounding each vertex whose `radii` entry
 *  is > 0 with an arc tangent to both adjacent edges. Used to give the rolled
 *  sections their real root fillets at the web/flange junctions. */
function roundedPath(pts: [number, number][], radii: number[]): string {
  const n = pts.length;
  const norm = (ax: number, ay: number): [number, number] => {
    const m = Math.hypot(ax, ay) || 1;
    return [ax / m, ay / m];
  };
  let d = "";
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pts[i];
    const [px, py] = pts[(i - 1 + n) % n];
    const [nx, ny] = pts[(i + 1) % n];
    const r = radii[i] ?? 0;
    if (r <= 0.5) {
      d += i === 0 ? `M${cx},${cy}` : ` L${cx},${cy}`;
      continue;
    }
    const [v1x, v1y] = norm(px - cx, py - cy);
    const [v2x, v2y] = norm(nx - cx, ny - cy);
    const rr = Math.min(r, Math.hypot(px - cx, py - cy) / 2, Math.hypot(nx - cx, ny - cy) / 2);
    const t1x = cx + v1x * rr;
    const t1y = cy + v1y * rr;
    const t2x = cx + v2x * rr;
    const t2y = cy + v2y * rr;
    const sweep = v1x * v2y - v1y * v2x < 0 ? 1 : 0;
    d += i === 0 ? `M${t1x},${t1y}` : ` L${t1x},${t1y}`;
    d += ` A${rr},${rr} 0 0 ${sweep} ${t2x},${t2y}`;
  }
  return `${d} Z`;
}

function Label({
  x,
  y,
  children,
  anchor = "middle",
  baseline = "auto",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  anchor?: "start" | "middle" | "end";
  baseline?: "auto" | "central";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline={baseline}
      fill={TXT}
      fontSize={FONT}
      fontFamily={MONO}
      fontWeight={600}
      stroke="none"
    >
      {children}
    </text>
  );
}

/** Horizontal overall dimension above the shape: extension lines up from the
 *  shape edge, an arrowed dimension line, and the value centred above it. */
function DimTop({ x1, x2, shapeY, value }: { x1: number; x2: number; shapeY: number; value: string }) {
  // Hug the shape rather than pinning to the canvas top, so thin sections
  // (plates) don't grow absurdly long extension lines.
  const y = Math.max(M.t - 16, shapeY - 18);
  return (
    <g stroke={DIM} strokeWidth={1}>
      <line x1={x1} y1={shapeY - 3} x2={x1} y2={y - 2} />
      <line x1={x2} y1={shapeY - 3} x2={x2} y2={y - 2} />
      <line x1={x1} y1={y} x2={x2} y2={y} markerStart="url(#fsArrow)" markerEnd="url(#fsArrow)" />
      <Label x={(x1 + x2) / 2} y={y - 4}>
        {value}
      </Label>
    </g>
  );
}

/** Vertical overall dimension to the left of the shape. */
function DimLeft({ y1, y2, shapeX, value }: { y1: number; y2: number; shapeX: number; value: string }) {
  const x = M.l - 20;
  return (
    <g stroke={DIM} strokeWidth={1}>
      <line x1={shapeX - 3} y1={y1} x2={x + 2} y2={y1} />
      <line x1={shapeX - 3} y1={y2} x2={x + 2} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} markerStart="url(#fsArrow)" markerEnd="url(#fsArrow)" />
      <Label x={x - 4} y={(y1 + y2) / 2} anchor="end" baseline="central">
        {value}
      </Label>
    </g>
  );
}

/** A leader: a labelled callout on the right pointing at a feature (fx, fy). */
function Leader({ fx, fy, lx, ly, value }: { fx: number; fy: number; lx: number; ly: number; value: string }) {
  return (
    <g>
      <line x1={lx - 2} y1={ly} x2={fx} y2={fy} stroke={DIM} strokeWidth={1} />
      <circle cx={fx} cy={fy} r={1.7} fill={DIM} stroke="none" />
      <Label x={lx} y={ly} anchor="start" baseline="central">
        {value}
      </Label>
    </g>
  );
}

/** Stack leader labels down the right margin, each pointing at its feature. */
function Leaders({ shapeX1, items }: { shapeX1: number; items: { value: string; fx: number; fy: number }[] }) {
  const lx = Math.min(shapeX1 + 18, VB_W - 44);
  const startY = M.t + 6;
  return (
    <>
      {items.map((it, i) => (
        <Leader key={i} fx={it.fx} fy={it.fy} lx={lx} ly={startY + i * 18} value={it.value} />
      ))}
    </>
  );
}

/* ── Per-kind rendering ──────────────────────────────────────────────────── */

function renderSection(sec: Section): React.ReactNode {
  switch (sec.kind) {
    case "ibeam":
    case "channel":
    case "tee": {
      const f = fitBox(sec.b, sec.h);
      const X = f.px;
      const Y = f.py;
      const l = (sec.b - sec.tw) / 2;
      const rr = (sec.b + sec.tw) / 2;
      // Fillet radius in px, kept within the flange/web thickness it sits in.
      const rp = Math.min(sec.r * f.s, sec.tf * f.s, sec.tw * f.s);
      let d: string;
      let webFx: number;
      let filletFx: number;
      let filletFy: number;
      if (sec.kind === "ibeam") {
        d = roundedPath(
          [
            [X(0), Y(0)], [X(sec.b), Y(0)], [X(sec.b), Y(sec.tf)],
            [X(rr), Y(sec.tf)], [X(rr), Y(sec.h - sec.tf)],
            [X(sec.b), Y(sec.h - sec.tf)], [X(sec.b), Y(sec.h)],
            [X(0), Y(sec.h)], [X(0), Y(sec.h - sec.tf)],
            [X(l), Y(sec.h - sec.tf)], [X(l), Y(sec.tf)], [X(0), Y(sec.tf)],
          ],
          [0, 0, 0, rp, rp, 0, 0, 0, 0, rp, rp, 0],
        );
        webFx = X(sec.b / 2);
        filletFx = X(rr) + rp * 0.4;
        filletFy = Y(sec.tf) + rp * 0.4;
      } else if (sec.kind === "channel") {
        d = roundedPath(
          [
            [X(0), Y(0)], [X(sec.b), Y(0)], [X(sec.b), Y(sec.tf)],
            [X(sec.tw), Y(sec.tf)], [X(sec.tw), Y(sec.h - sec.tf)],
            [X(sec.b), Y(sec.h - sec.tf)], [X(sec.b), Y(sec.h)], [X(0), Y(sec.h)],
          ],
          [0, 0, 0, rp, rp, 0, 0, 0],
        );
        webFx = X(sec.tw / 2);
        filletFx = X(sec.tw) + rp * 0.4;
        filletFy = Y(sec.tf) + rp * 0.4;
      } else {
        d = roundedPath(
          [
            [X(0), Y(0)], [X(sec.b), Y(0)], [X(sec.b), Y(sec.tf)],
            [X(rr), Y(sec.tf)], [X(rr), Y(sec.h)],
            [X(l), Y(sec.h)], [X(l), Y(sec.tf)], [X(0), Y(sec.tf)],
          ],
          [0, 0, 0, rp, 0, 0, rp, 0],
        );
        webFx = X(sec.b / 2);
        filletFx = X(rr) + rp * 0.4;
        filletFy = Y(sec.tf) + rp * 0.4;
      }
      const leaders = [
        { value: `tf ${fmt(sec.tf)}`, fx: X(sec.b * 0.82), fy: Y(sec.tf / 2) },
        { value: `tw ${fmt(sec.tw)}`, fx: webFx, fy: Y(sec.h / 2) },
      ];
      if (sec.r > 0) leaders.push({ value: `r ${fmt(sec.r)}`, fx: filletFx, fy: filletFy });
      return (
        <>
          <path d={d} {...SHAPE} strokeLinejoin="round" />
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.b)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.h)} />
          <Leaders shapeX1={f.x1} items={leaders} />
        </>
      );
    }
    case "box": {
      const f = fitBox(sec.b, sec.h);
      const wall = Math.max(3, sec.t * f.s);
      const inner = `M${f.x0 + wall},${f.y0 + wall} h${f.w - 2 * wall} v${f.h - 2 * wall} h${-(f.w - 2 * wall)} Z`;
      const outer = `M${f.x0},${f.y0} h${f.w} v${f.h} h${-f.w} Z`;
      return (
        <>
          <path d={`${outer} ${inner}`} fillRule="evenodd" {...SHAPE} />
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.b)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.h)} />
          <Leaders shapeX1={f.x1} items={[{ value: `t ${fmt(sec.t)}`, fx: f.x1 - wall / 2, fy: f.y0 + f.h / 2 }]} />
        </>
      );
    }
    case "pipe": {
      const f = fitBox(sec.d, sec.d);
      const cx = f.x0 + f.w / 2;
      const cy = f.y0 + f.h / 2;
      const R = f.w / 2;
      const wall = Math.max(3, sec.t * f.s);
      const r = R - wall;
      const ring =
        `M${cx - R},${cy} a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0 ` +
        `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
      return (
        <>
          <path d={ring} fillRule="evenodd" {...SHAPE} />
          <DimTop x1={cx - R} x2={cx + R} shapeY={f.y0} value={`Ø${fmt(sec.d)}`} />
          <Leaders shapeX1={f.x1} items={[{ value: `t ${fmt(sec.t)}`, fx: cx + R - wall / 2, fy: cy }]} />
        </>
      );
    }
    case "round": {
      const f = fitBox(sec.d, sec.d);
      const cx = f.x0 + f.w / 2;
      const cy = f.y0 + f.h / 2;
      return (
        <>
          <circle cx={cx} cy={cy} r={f.w / 2} {...SHAPE} />
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={`Ø${fmt(sec.d)}`} />
        </>
      );
    }
    case "square": {
      const f = fitBox(sec.a, sec.a);
      return (
        <>
          <rect x={f.x0} y={f.y0} width={f.w} height={f.h} rx={1.5} {...SHAPE} />
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.a)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.a)} />
        </>
      );
    }
    case "plate":
    case "chequered": {
      const w = sec.w;
      const t = sec.t;
      const f = fitBox(w, t);
      const items = [{ value: `t ${fmt(t)}`, fx: f.x1 - 4, fy: f.y0 + f.h / 2 }];
      if (sec.kind === "chequered") {
        items.push({ value: `pat ${fmt(sec.ph)}`, fx: f.x0 + f.w * 0.5, fy: f.y0 - 2 });
      }
      const dots =
        sec.kind === "chequered"
          ? [0.28, 0.5, 0.72].map((frac, i) => (
              <circle key={i} cx={f.x0 + frac * f.w} cy={f.y0 - 2.4} r={1.5} fill="var(--accent)" stroke="none" />
            ))
          : null;
      return (
        <>
          <rect x={f.x0} y={f.y0} width={f.w} height={f.h} rx={1} {...SHAPE} />
          {dots}
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(w)} />
          <Leaders shapeX1={f.x1} items={items} />
        </>
      );
    }
    case "angle": {
      const f = fitBox(sec.b, sec.a);
      const X = f.px;
      const Y = f.py;
      const t = sec.t;
      const d = [
        `M${X(0)},${Y(0)}`, `L${X(t)},${Y(0)}`, `L${X(t)},${Y(sec.a - t)}`,
        `L${X(sec.b)},${Y(sec.a - t)}`, `L${X(sec.b)},${Y(sec.a)}`,
        `L${X(0)},${Y(sec.a)}`, "Z",
      ].join(" ");
      return (
        <>
          <path d={d} {...SHAPE} strokeLinejoin="round" />
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.b)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.a)} />
          <Leaders
            shapeX1={f.x1}
            items={[{ value: `t ${fmt(t)}`, fx: X(sec.b * 0.72), fy: Y(sec.a - t / 2) }]}
          />
        </>
      );
    }
  }
}

export function ProfileDrawing({
  p,
  className,
}: {
  p: CommandParseResult;
  className?: string;
}) {
  const sec = p.valid ? resolveSection(p) : null;

  if (!sec) {
    // Expanded/corrugated or incomplete geometry — keep the recognisable glyph.
    return (
      <div className={className} style={{ color: "var(--accent)" }}>
        {p.alias ? <CommandGlyph fam={p.alias.fam} size={64} /> : null}
      </div>
    );
  }

  return (
    <figure className={className} style={{ margin: 0, width: "100%" }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={p.name ?? undefined}
        style={{ display: "block", maxWidth: 340, margin: "0 auto" }}
      >
        <defs>
          <marker
            id="fsArrow"
            markerWidth={8}
            markerHeight={8}
            refX={7}
            refY={4}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill={DIM} />
          </marker>
        </defs>
        {renderSection(sec)}
      </svg>
    </figure>
  );
}
