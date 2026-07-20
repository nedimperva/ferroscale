import type { CommandParseResult, DimensionKey } from "@ferroscale/metal-core";
import { getStandardProfileSpecRecord, toMillimeters } from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";

/**
 * A scaled, dimensioned cross-section of the current profile — the flat glyph
 * upgraded into something that reads like an engineering drawing. Standard
 * profiles (I-beams, channels, tees) take their geometry from the shared spec
 * records (web/flange thickness, root radius); manual families read their
 * parsed dimensions. Shapes we can't meaningfully dimension (expanded /
 * corrugated) fall back to the plain glyph.
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

/* ── SVG frame ───────────────────────────────────────────────────────────── */

const VB_W = 240;
const VB_H = 170;
const MARGIN = { l: 22, r: 48, t: 28, b: 22 };
const CW = VB_W - MARGIN.l - MARGIN.r;
const CH = VB_H - MARGIN.t - MARGIN.b;
const MIN_THICK = 7; // keep very thin sections/walls visible

const SHAPE = {
  fill: "var(--accent-surface)",
  stroke: "var(--accent)",
  strokeWidth: 1.6,
} as const;

/** Fit a real mm bounding box into the content area; returns a mm→px mapper. */
function fitBox(bw: number, bh: number) {
  const s = Math.min(CW / bw, CH / bh);
  let w = bw * s;
  let h = bh * s;
  if (h < MIN_THICK && w > h) h = Math.min(MIN_THICK, CH);
  if (w < MIN_THICK && h > w) w = Math.min(MIN_THICK, CW);
  const x0 = MARGIN.l + (CW - w) / 2;
  const y0 = MARGIN.t + (CH - h) / 2;
  return {
    x0,
    y0,
    w,
    h,
    px: (mx: number) => x0 + (mx / bw) * w,
    py: (my: number) => y0 + (my / bh) * h,
  };
}

function DimTop({ x0, x1, y, value }: { x0: number; x1: number; y: number; value: string }) {
  return (
    <g stroke="var(--muted)" strokeWidth={0.9}>
      <line x1={x0} y1={y} x2={x1} y2={y} />
      <line x1={x0} y1={y - 3} x2={x0} y2={y + 3} />
      <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} />
      <text
        x={(x0 + x1) / 2}
        y={y - 5}
        textAnchor="middle"
        stroke="none"
        fill="var(--foreground-secondary)"
        fontSize={10}
        fontFamily="var(--font-mono, monospace)"
        fontWeight={600}
      >
        {value}
      </text>
    </g>
  );
}

function DimRight({ y0, y1, x, value }: { y0: number; y1: number; x: number; value: string }) {
  return (
    <g stroke="var(--muted)" strokeWidth={0.9}>
      <line x1={x} y1={y0} x2={x} y2={y1} />
      <line x1={x - 3} y1={y0} x2={x + 3} y2={y0} />
      <line x1={x - 3} y1={y1} x2={x + 3} y2={y1} />
      <text
        x={x + 5}
        y={(y0 + y1) / 2}
        dominantBaseline="middle"
        stroke="none"
        fill="var(--foreground-secondary)"
        fontSize={10}
        fontFamily="var(--font-mono, monospace)"
        fontWeight={600}
      >
        {value}
      </text>
    </g>
  );
}

/* ── Per-kind rendering ──────────────────────────────────────────────────── */

function renderSection(sec: Section): { body: React.ReactNode; caption: string } {
  switch (sec.kind) {
    case "ibeam":
    case "channel":
    case "tee": {
      const f = fitBox(sec.b, sec.h);
      const X = f.px;
      const Y = f.py;
      let d: string;
      if (sec.kind === "ibeam") {
        const l = (sec.b - sec.tw) / 2;
        const rr = (sec.b + sec.tw) / 2;
        d = [
          `M${X(0)},${Y(0)}`, `L${X(sec.b)},${Y(0)}`, `L${X(sec.b)},${Y(sec.tf)}`,
          `L${X(rr)},${Y(sec.tf)}`, `L${X(rr)},${Y(sec.h - sec.tf)}`,
          `L${X(sec.b)},${Y(sec.h - sec.tf)}`, `L${X(sec.b)},${Y(sec.h)}`,
          `L${X(0)},${Y(sec.h)}`, `L${X(0)},${Y(sec.h - sec.tf)}`,
          `L${X(l)},${Y(sec.h - sec.tf)}`, `L${X(l)},${Y(sec.tf)}`,
          `L${X(0)},${Y(sec.tf)}`, "Z",
        ].join(" ");
      } else if (sec.kind === "channel") {
        d = [
          `M${X(0)},${Y(0)}`, `L${X(sec.b)},${Y(0)}`, `L${X(sec.b)},${Y(sec.tf)}`,
          `L${X(sec.tw)},${Y(sec.tf)}`, `L${X(sec.tw)},${Y(sec.h - sec.tf)}`,
          `L${X(sec.b)},${Y(sec.h - sec.tf)}`, `L${X(sec.b)},${Y(sec.h)}`,
          `L${X(0)},${Y(sec.h)}`, "Z",
        ].join(" ");
      } else {
        const l = (sec.b - sec.tw) / 2;
        const rr = (sec.b + sec.tw) / 2;
        d = [
          `M${X(0)},${Y(0)}`, `L${X(sec.b)},${Y(0)}`, `L${X(sec.b)},${Y(sec.tf)}`,
          `L${X(rr)},${Y(sec.tf)}`, `L${X(rr)},${Y(sec.h)}`,
          `L${X(l)},${Y(sec.h)}`, `L${X(l)},${Y(sec.tf)}`,
          `L${X(0)},${Y(sec.tf)}`, "Z",
        ].join(" ");
      }
      const caption =
        `tw ${fmt(sec.tw)} · tf ${fmt(sec.tf)}` + (sec.r > 0 ? ` · r ${fmt(sec.r)}` : "");
      return {
        body: (
          <>
            <path d={d} {...SHAPE} strokeLinejoin="round" />
            <DimTop x0={f.x0} x1={f.x0 + f.w} y={MARGIN.t - 12} value={fmt(sec.b)} />
            <DimRight y0={f.y0} y1={f.y0 + f.h} x={f.x0 + f.w + 8} value={fmt(sec.h)} />
          </>
        ),
        caption,
      };
    }
    case "box": {
      const f = fitBox(sec.b, sec.h);
      const wall = Math.max(3, (sec.t / sec.b) * f.w);
      const inner = `M${f.x0 + wall},${f.y0 + wall} h${f.w - 2 * wall} v${f.h - 2 * wall} h${-(f.w - 2 * wall)} Z`;
      const outer = `M${f.x0},${f.y0} h${f.w} v${f.h} h${-f.w} Z`;
      return {
        body: (
          <>
            <path d={`${outer} ${inner}`} fillRule="evenodd" {...SHAPE} />
            <DimTop x0={f.x0} x1={f.x0 + f.w} y={MARGIN.t - 12} value={fmt(sec.b)} />
            <DimRight y0={f.y0} y1={f.y0 + f.h} x={f.x0 + f.w + 8} value={fmt(sec.h)} />
          </>
        ),
        caption: `t ${fmt(sec.t)}`,
      };
    }
    case "pipe": {
      const f = fitBox(sec.d, sec.d);
      const cx = f.x0 + f.w / 2;
      const cy = f.y0 + f.h / 2;
      const R = f.w / 2;
      const wall = Math.max(3, (sec.t / sec.d) * f.w);
      const r = R - wall;
      const ring =
        `M${cx - R},${cy} a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0 ` +
        `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
      return {
        body: (
          <>
            <path d={ring} fillRule="evenodd" {...SHAPE} />
            <DimTop x0={cx - R} x1={cx + R} y={MARGIN.t - 12} value={`Ø${fmt(sec.d)}`} />
          </>
        ),
        caption: `t ${fmt(sec.t)}`,
      };
    }
    case "round": {
      const f = fitBox(sec.d, sec.d);
      const cx = f.x0 + f.w / 2;
      const cy = f.y0 + f.h / 2;
      return {
        body: (
          <>
            <circle cx={cx} cy={cy} r={f.w / 2} {...SHAPE} />
            <DimTop x0={f.x0} x1={f.x0 + f.w} y={MARGIN.t - 12} value={`Ø${fmt(sec.d)}`} />
          </>
        ),
        caption: "",
      };
    }
    case "square": {
      const f = fitBox(sec.a, sec.a);
      return {
        body: (
          <>
            <rect x={f.x0} y={f.y0} width={f.w} height={f.h} rx={1.5} {...SHAPE} />
            <DimTop x0={f.x0} x1={f.x0 + f.w} y={MARGIN.t - 12} value={fmt(sec.a)} />
            <DimRight y0={f.y0} y1={f.y0 + f.h} x={f.x0 + f.w + 8} value={fmt(sec.a)} />
          </>
        ),
        caption: "",
      };
    }
    case "plate":
    case "chequered": {
      const w = sec.w;
      const t = sec.t;
      const f = fitBox(w, t);
      const dots =
        sec.kind === "chequered"
          ? [0.25, 0.5, 0.75].map((frac, i) => (
              <circle
                key={i}
                cx={f.x0 + frac * f.w}
                cy={f.y0 - 2}
                r={1.4}
                fill="var(--accent)"
              />
            ))
          : null;
      return {
        body: (
          <>
            <rect x={f.x0} y={f.y0} width={f.w} height={f.h} rx={1} {...SHAPE} />
            {dots}
            <DimTop x0={f.x0} x1={f.x0 + f.w} y={MARGIN.t - 12} value={fmt(w)} />
            <DimRight y0={f.y0} y1={f.y0 + f.h} x={f.x0 + f.w + 8} value={fmt(t)} />
          </>
        ),
        caption: sec.kind === "chequered" ? `pattern ${fmt(sec.ph)}` : "",
      };
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
      return {
        body: (
          <>
            <path d={d} {...SHAPE} strokeLinejoin="round" />
            <DimTop x0={f.x0} x1={f.x0 + f.w} y={MARGIN.t - 12} value={fmt(sec.b)} />
            <DimRight y0={f.y0} y1={f.y0 + f.h} x={f.x0 + f.w + 8} value={fmt(sec.a)} />
          </>
        ),
        caption: `t ${fmt(t)}`,
      };
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

  const { body, caption } = renderSection(sec);
  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={p.name ?? undefined}
        style={{ display: "block", maxWidth: 260 }}
      >
        {body}
      </svg>
      {caption ? (
        <figcaption
          className="font-mono text-[10.5px] text-muted text-center"
          style={{ marginTop: -4 }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
