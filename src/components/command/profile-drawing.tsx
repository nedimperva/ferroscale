import { createContext, useContext, useId } from "react";
import type { CommandParseResult } from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";
import {
  EXTRUDE,
  FRAME,
  circleEvenoddPath,
  circleWallPath,
  fitSection,
  mapRing,
  polyPath,
  quadPath,
  resolveSection,
  roundedPath,
  sectionModel,
  visibleSideQuads,
  type FittedBox,
  type Section,
  type SideQuad,
} from "./profile-drawing-geom";

/**
 * Off in `thumb` mode: the shape is drawn, the dimension lines and leader
 * labels are not. One geometry source, two sizes — a saved card shows the same
 * real section as the breakdown, just without millimetre callouts that would
 * be unreadable at 64px.
 */
const DimensionsShown = createContext(true);

/**
 * A short cabinet stub of the current profile: the true cross-section on the
 * cut face, extruded up-right so the piece reads as stock. Millimetre callouts
 * stay on the cut. Standard profiles take geometry from the spec records;
 * manual families from the parsed dimensions. Expanded/corrugated fall back
 * to the plain glyph.
 */

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

/* ── SVG frame & primitives ──────────────────────────────────────────────── */

const { vbW: VB_W, vbH: VB_H, margin: M } = FRAME;
const CW = VB_W - M.l - M.r;
const CH = VB_H - M.t - M.b;

const DIM = "var(--muted)";
const TXT = "var(--foreground-secondary)";
const MONO = "var(--font-mono, ui-monospace, monospace)";
const FONT = 11.5;

const CUT = {
  fill: "var(--accent-surface)",
  stroke: "var(--accent)",
  strokeWidth: 1.7,
} as const;

const FACE = {
  top: "color-mix(in srgb, var(--accent) 16%, var(--accent-surface))",
  side: "color-mix(in srgb, var(--accent) 34%, var(--surface))",
  stroke: "color-mix(in srgb, var(--accent) 58%, var(--border))",
} as const;

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

const ArrowId = createContext("fsArrow");

function DimTop({ x1, x2, shapeY, value }: { x1: number; x2: number; shapeY: number; value: string }) {
  const id = useContext(ArrowId);
  const y = Math.max(12, shapeY + EXTRUDE.dy - 14);
  if (!useContext(DimensionsShown)) return null;
  return (
    <g stroke={DIM} strokeWidth={1}>
      <line x1={x1} y1={shapeY - 2} x2={x1} y2={y - 2} />
      <line x1={x2} y1={shapeY - 2} x2={x2} y2={y - 2} />
      <line x1={x1} y1={y} x2={x2} y2={y} markerStart={`url(#${id})`} markerEnd={`url(#${id})`} />
      <Label x={(x1 + x2) / 2} y={y - 3}>
        {value}
      </Label>
    </g>
  );
}

function DimLeft({ y1, y2, shapeX, value }: { y1: number; y2: number; shapeX: number; value: string }) {
  const id = useContext(ArrowId);
  const x = M.l - 24;
  if (!useContext(DimensionsShown)) return null;
  return (
    <g stroke={DIM} strokeWidth={1}>
      <line x1={shapeX - 2} y1={y1} x2={x + 2} y2={y1} />
      <line x1={shapeX - 2} y1={y2} x2={x + 2} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} markerStart={`url(#${id})`} markerEnd={`url(#${id})`} />
      <Label x={x - 4} y={(y1 + y2) / 2} anchor="end" baseline="central">
        {value}
      </Label>
    </g>
  );
}

/** Short vertical feature dim (tf, wall). Label sits beside the line. */
function DimV({
  x,
  y1,
  y2,
  value,
  side = "left",
}: {
  x: number;
  y1: number;
  y2: number;
  value: string;
  side?: "left" | "right";
}) {
  const id = useContext(ArrowId);
  if (!useContext(DimensionsShown)) return null;
  const top = Math.min(y1, y2);
  const bot = Math.max(y1, y2);
  const mid = (top + bot) / 2;
  const tall = bot - top >= 16;
  const labelX = side === "left" ? x - 4 : x + 4;
  const anchor = side === "left" ? "end" : "start";
  return (
    <g stroke={DIM} strokeWidth={1}>
      <line x1={x - 2.5} y1={top} x2={x + 2.5} y2={top} />
      <line x1={x - 2.5} y1={bot} x2={x + 2.5} y2={bot} />
      {tall ? (
        <line x1={x} y1={top} x2={x} y2={bot} markerStart={`url(#${id})`} markerEnd={`url(#${id})`} />
      ) : (
        <line x1={x} y1={top} x2={x} y2={bot} />
      )}
      <Label x={labelX} y={mid} anchor={anchor} baseline="central">
        {value}
      </Label>
    </g>
  );
}

/** Short horizontal feature dim (tw, wall). Label sits above the line. */
function DimH({
  y,
  x1,
  x2,
  value,
}: {
  y: number;
  x1: number;
  x2: number;
  value: string;
}) {
  const id = useContext(ArrowId);
  if (!useContext(DimensionsShown)) return null;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const mid = (left + right) / 2;
  const wide = right - left >= 22;
  return (
    <g stroke={DIM} strokeWidth={1}>
      <line x1={left} y1={y - 2.5} x2={left} y2={y + 2.5} />
      <line x1={right} y1={y - 2.5} x2={right} y2={y + 2.5} />
      {wide ? (
        <line
          x1={left}
          y1={y}
          x2={right}
          y2={y}
          markerStart={`url(#${id})`}
          markerEnd={`url(#${id})`}
        />
      ) : (
        <line x1={left} y1={y} x2={right} y2={y} />
      )}
      <Label x={wide ? mid : right + 4} y={wide ? y - 3 : y} anchor={wide ? "middle" : "start"} baseline={wide ? "auto" : "central"}>
        {value}
      </Label>
    </g>
  );
}

/** Compact label at a feature — no long leader across the stub. */
function Tick({ x, y, value, dx = 8, dy = -2 }: { x: number; y: number; value: string; dx?: number; dy?: number }) {
  if (!useContext(DimensionsShown)) return null;
  return (
    <g>
      <circle cx={x} cy={y} r={1.4} fill={DIM} stroke="none" />
      <line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke={DIM} strokeWidth={1} />
      <Label x={x + dx + 2} y={y + dy} anchor="start" baseline="central">
        {value}
      </Label>
    </g>
  );
}

function SideFaces({ quads }: { quads: SideQuad[] }) {
  return (
    <g stroke={FACE.stroke} strokeWidth={1} strokeLinejoin="round">
      {quads.map((q, i) => (
        <path key={i} d={quadPath(q)} fill={q.role === "top" ? FACE.top : FACE.side} />
      ))}
    </g>
  );
}

function sortFarToNear(quads: SideQuad[], dx: number, dy: number): SideQuad[] {
  return [...quads].sort((a, b) => {
    const da = a.a.x * dx + a.a.y * dy + a.b.x * dx + a.b.y * dy;
    const db = b.a.x * dx + b.a.y * dy + b.b.x * dx + b.b.y * dy;
    return da - db;
  });
}

/* ── Per-kind rendering ──────────────────────────────────────────────────── */

function renderSection(sec: Section): React.ReactNode {
  const model = sectionModel(sec);
  const f = fitSection(model.widthMm, model.heightMm);
  const { dx, dy } = EXTRUDE;

  if (model.kind === "circle") {
    return <CircleSection sec={sec} model={model} f={f} dx={dx} dy={dy} />;
  }

  const outer = mapRing(model.outer, f);
  const holes = model.holes.map((hole) => clampHole(mapRing(hole, f), f));
  // Sharp rings for the stub — fillets stay on the cut so the 3D doesn't stair-step.
  const outerQuads = visibleSideQuads(outer.pts, dx, dy);
  const holeQuads = holes.flatMap((hole) => visibleSideQuads(hole.pts, dx, dy));
  const front = `${roundedPath(outer.pts, outer.radii)}${holes.map((h) => ` ${polyPath(h.pts)}`).join("")}`;

  const dims = renderDims(sec, f);
  const extras = renderExtras(sec, f);

  return (
    <>
      <SideFaces quads={sortFarToNear(outerQuads, dx, dy)} />
      {holes.map((hole, i) => (
        <path
          key={i}
          d={polyPath(hole.pts.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })))}
          fill="var(--surface-inset)"
          stroke={FACE.stroke}
          strokeWidth={1}
        />
      ))}
      {holeQuads.length > 0 ? <SideFaces quads={sortFarToNear(holeQuads, dx, dy)} /> : null}
      <path d={front} fillRule="evenodd" {...CUT} strokeLinejoin="round" />
      {extras}
      {dims}
    </>
  );
}

function clampHole(
  hole: { pts: { x: number; y: number }[]; radii: number[] },
  f: FittedBox,
): { pts: { x: number; y: number }[]; radii: number[] } {
  // Keep a visible wall when the scale would collapse the thickness.
  const inset = 3;
  const minW = f.w - 2 * inset;
  const minH = f.h - 2 * inset;
  if (minW < 2 || minH < 2) return hole;
  const xs = hole.pts.map((pt) => pt.x);
  const ys = hole.pts.map((pt) => pt.y);
  const hw = Math.max(...xs) - Math.min(...xs);
  const hh = Math.max(...ys) - Math.min(...ys);
  if (hw <= minW && hh <= minH) return hole;
  return {
    pts: [
      { x: f.x0 + inset, y: f.y0 + inset },
      { x: f.x1 - inset, y: f.y0 + inset },
      { x: f.x1 - inset, y: f.y1 - inset },
      { x: f.x0 + inset, y: f.y1 - inset },
    ],
    radii: [0, 0, 0, 0],
  };
}

function CircleSection({
  sec,
  model,
  f,
  dx,
  dy,
}: {
  sec: Section;
  model: Extract<ReturnType<typeof sectionModel>, { kind: "circle" }>;
  f: FittedBox;
  dx: number;
  dy: number;
}) {
  const cx = f.px(model.cx);
  const cy = f.py(model.cy);
  const R = Math.max(4, model.outerR * f.s);
  const innerR =
    model.innerR != null ? Math.max(0, Math.min(model.innerR * f.s, R - 3)) : null;
  return (
    <>
      <path
        d={circleWallPath(cx, cy, R, dx, dy)}
        fill={FACE.side}
        stroke={FACE.stroke}
        strokeWidth={1}
      />
      <path d={circleEvenoddPath(cx, cy, R, innerR)} fillRule="evenodd" {...CUT} />
      {renderDims(sec, f)}
    </>
  );
}

function renderExtras(sec: Section, f: FittedBox): React.ReactNode {
  if (sec.kind !== "chequered") return null;
  return [0.28, 0.5, 0.72].map((frac, i) => (
    <circle
      key={i}
      cx={f.x0 + frac * f.w}
      cy={f.y0 - 2.4}
      r={1.5}
      fill="var(--accent)"
      stroke="none"
    />
  ));
}

function renderDims(sec: Section, f: FittedBox): React.ReactNode {
  switch (sec.kind) {
    case "ibeam":
    case "channel":
    case "tee": {
      const X = f.px;
      const Y = f.py;
      const l = (sec.b - sec.tw) / 2;
      const rr = (sec.b + sec.tw) / 2;
      const webLeft = sec.kind === "channel" ? 0 : l;
      const webRight = sec.kind === "channel" ? sec.tw : rr;
      const filletX = sec.kind === "channel" ? X(sec.tw) : X(rr);
      const tfPx = Math.max(1, Y(sec.tf) - f.y0);
      return (
        <>
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.b)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.h)} />
          <DimV
            x={f.x0 + Math.min(14, f.w * 0.12)}
            y1={f.y0}
            y2={f.y0 + tfPx}
            value={`tf ${fmt(sec.tf)}`}
            side="right"
          />
          <DimH
            y={Y(sec.h * 0.48)}
            x1={X(webLeft)}
            x2={X(webRight)}
            value={`tw ${fmt(sec.tw)}`}
          />
          {sec.r > 0 ? (
            <Tick x={filletX + 2} y={Y(sec.tf) + 7} value={`R${fmt(sec.r)}`} dx={9} dy={11} />
          ) : null}
        </>
      );
    }
    case "box": {
      const wall = Math.max(3, sec.t * f.s);
      return (
        <>
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.b)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.h)} />
          <DimV
            x={f.x0 + Math.min(14, f.w * 0.22)}
            y1={f.y0}
            y2={f.y0 + wall}
            value={`t ${fmt(sec.t)}`}
            side="right"
          />
        </>
      );
    }
    case "pipe": {
      const wall = Math.max(3, sec.t * f.s);
      return (
        <>
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={`Ø${fmt(sec.d)}`} />
          <DimV
            x={f.x0 + 10}
            y1={f.y0}
            y2={f.y0 + wall}
            value={`t ${fmt(sec.t)}`}
            side="right"
          />
        </>
      );
    }
    case "round":
      return <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={`Ø${fmt(sec.d)}`} />;
    case "square":
      return (
        <>
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.a)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.a)} />
        </>
      );
    case "plate":
    case "chequered":
      return (
        <>
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.w)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={`t ${fmt(sec.t)}`} />
          {sec.kind === "chequered" ? (
            <Tick x={f.x0 + f.w * 0.5} y={f.y0 - 2} value={`pat ${fmt(sec.ph)}`} dx={0} dy={-10} />
          ) : null}
        </>
      );
    case "angle":
      return (
        <>
          <DimTop x1={f.x0} x2={f.x1} shapeY={f.y0} value={fmt(sec.b)} />
          <DimLeft y1={f.y0} y2={f.y1} shapeX={f.x0} value={fmt(sec.a)} />
          <DimV
            x={f.x0 + Math.max(8, sec.t * f.s + 8)}
            y1={f.py(sec.a - sec.t)}
            y2={f.y1}
            value={`t ${fmt(sec.t)}`}
            side="right"
          />
        </>
      );
  }
}

export function ProfileDrawing({
  p,
  className,
  variant = "full",
}: {
  p: CommandParseResult;
  className?: string;
  /** `thumb` drops the dimension callouts and the entrance animation — for
   *  card-sized renders where only the silhouette reads. */
  variant?: "full" | "thumb";
}) {
  const markerId = useId().replace(/:/g, "");
  const sec = p.valid ? resolveSection(p) : null;
  const thumb = variant === "thumb";
  const appear = thumb ? "" : "fs-appear";

  if (!sec) {
    return (
      <div
        key={p.alias?.fam ?? "none"}
        className={`${appear} ${className ?? ""}`}
        style={{ color: "var(--accent)" }}
      >
        {p.alias ? <CommandGlyph fam={p.alias.fam} size={thumb ? 30 : 64} /> : null}
      </div>
    );
  }

  return (
    <figure
      key={sec.kind}
      className={`${appear} ${thumb ? "fs-thumb" : ""} ${className ?? ""}`}
      style={{ margin: 0, width: "100%" }}
    >
      <svg
        viewBox={thumb ? `${M.l - 4} ${M.t - 4} ${CW + 8} ${CH + 8}` : `0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={p.name ?? undefined}
        style={{ display: "block", maxWidth: thumb ? undefined : 340, margin: "0 auto" }}
      >
        <defs>
          <marker
            id={`fsArrow-${markerId}`}
            markerWidth={6}
            markerHeight={6}
            refX={5.5}
            refY={3}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={DIM} />
          </marker>
        </defs>
        <DimensionsShown.Provider value={!thumb}>
          <ArrowId.Provider value={`fsArrow-${markerId}`}>{renderSection(sec)}</ArrowId.Provider>
        </DimensionsShown.Provider>
      </svg>
    </figure>
  );
}
