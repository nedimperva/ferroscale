"use client";

import { memo } from "react";
import type { ProfileId, DimensionKey } from "@/lib/datasets/types";

interface ProfileDiagramProps {
  profileId: ProfileId;
  dimensions: Record<string, { value: number; unit: string } | undefined>;
  highlightDimension?: DimensionKey;
  className?: string;
}

const DIM_COLOR = "var(--accent)";
const DIM_FAINT = "var(--muted-faint)";
const SHAPE_STROKE = "var(--border-strong)";
const SHAPE_FILL = "var(--surface-raised)";

function DimArrow({
  x1, y1, x2, y2, label, side = "right",
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; side?: "right" | "left" | "top" | "bottom";
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const textAnchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
  const dx = side === "right" ? 4 : side === "left" ? -4 : 0;
  const dy = side === "top" ? -4 : side === "bottom" ? 10 : 3;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIM_COLOR} strokeWidth={1} markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
      <text x={mx + dx} y={my + dy} fill={DIM_COLOR} fontSize={7} fontWeight={600} textAnchor={textAnchor} fontFamily="var(--font-sans)">
        {label}
      </text>
    </g>
  );
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="arrowEnd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="none" stroke={DIM_COLOR} strokeWidth={1} />
      </marker>
      <marker id="arrowStart" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
        <path d="M6,0 L0,3 L6,6" fill="none" stroke={DIM_COLOR} strokeWidth={1} />
      </marker>
    </defs>
  );
}

function RoundBarDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <circle cx={42} cy={36} r={22} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} />
      <DimArrow x1={42} y1={14} x2={42} y2={58} label="d" side="right" />
      <line x1={42} y1={14} x2={47} y2={14} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={42} y1={58} x2={47} y2={58} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function SquareBarDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={20} y={14} width={44} height={44} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={1} />
      <DimArrow x1={72} y1={14} x2={72} y2={58} label="a" side="right" />
      <line x1={64} y1={14} x2={72} y2={14} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={64} y1={58} x2={72} y2={58} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function FlatBarDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={12} y={22} width={60} height={28} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={1} />
      {/* width arrow (top) */}
      <DimArrow x1={12} y1={15} x2={72} y2={15} label="b" side="top" />
      <line x1={12} y1={22} x2={12} y2={15} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={72} y1={22} x2={72} y2={15} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* thickness arrow (right) */}
      <DimArrow x1={80} y1={22} x2={80} y2={50} label="t" side="right" />
      <line x1={72} y1={22} x2={80} y2={22} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={72} y1={50} x2={80} y2={50} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function AngleDiagram() {
  return (
    <svg viewBox="0 0 100 80" className="w-full h-full">
      <ArrowDefs />
      {/* L-shape */}
      <path
        d="M18,10 L18,62 L62,62 L62,54 L26,54 L26,10 Z"
        fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} strokeLinejoin="round"
      />
      {/* legA (vertical) */}
      <DimArrow x1={12} y1={10} x2={12} y2={62} label="a" side="left" />
      <line x1={18} y1={10} x2={12} y2={10} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={18} y1={62} x2={12} y2={62} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* legB (horizontal) */}
      <DimArrow x1={18} y1={72} x2={62} y2={72} label="b" side="bottom" />
      <line x1={18} y1={62} x2={18} y2={72} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={62} y1={62} x2={62} y2={72} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* thickness */}
      <DimArrow x1={18} y1={6} x2={26} y2={6} label="t" side="top" />
    </svg>
  );
}

function PipeDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <circle cx={40} cy={36} r={22} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} />
      <circle cx={40} cy={36} r={16} fill="var(--surface)" stroke={SHAPE_STROKE} strokeWidth={1} strokeDasharray="3 1.5" />
      {/* OD arrow */}
      <DimArrow x1={40} y1={14} x2={40} y2={58} label="OD" side="right" />
      <line x1={40} y1={14} x2={46} y2={14} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={40} y1={58} x2={46} y2={58} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* wall thickness arrow */}
      <DimArrow x1={72} y1={30} x2={72} y2={36} label="t" side="right" />
      <line x1={40} y1={36} x2={72} y2={36} stroke={DIM_FAINT} strokeWidth={0.3} strokeDasharray="1.5 1" opacity={0.4} />
      <line x1={62} y1={30} x2={72} y2={30} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function RectangularTubeDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={14} y={12} width={52} height={48} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={2} />
      <rect x={20} y={18} width={40} height={36} fill="var(--surface)" stroke={SHAPE_STROKE} strokeWidth={1} rx={1} strokeDasharray="3 1.5" />
      {/* width B (top) */}
      <DimArrow x1={14} y1={6} x2={66} y2={6} label="B" side="top" />
      <line x1={14} y1={12} x2={14} y2={6} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={66} y1={12} x2={66} y2={6} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* height H (right) */}
      <DimArrow x1={74} y1={12} x2={74} y2={60} label="H" side="right" />
      <line x1={66} y1={12} x2={74} y2={12} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={66} y1={60} x2={74} y2={60} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* wall thickness (bottom-left) */}
      <DimArrow x1={14} y1={67} x2={20} y2={67} label="t" side="bottom" />
      <line x1={14} y1={60} x2={14} y2={67} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={20} y1={60} x2={20} y2={67} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function SquareHollowDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={18} y={8} width={48} height={48} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={2} />
      <rect x={24} y={14} width={36} height={36} fill="var(--surface)" stroke={SHAPE_STROKE} strokeWidth={1} rx={1} strokeDasharray="3 1.5" />
      {/* side a (right) */}
      <DimArrow x1={74} y1={8} x2={74} y2={56} label="a" side="right" />
      <line x1={66} y1={8} x2={74} y2={8} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={66} y1={56} x2={74} y2={56} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* wall thickness (bottom) */}
      <DimArrow x1={18} y1={64} x2={24} y2={64} label="t" side="bottom" />
      <line x1={18} y1={56} x2={18} y2={64} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={24} y1={56} x2={24} y2={64} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function SheetDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={10} y={28} width={64} height={16} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={0.5} />
      {/* width (top) */}
      <DimArrow x1={10} y1={21} x2={74} y2={21} label="w" side="top" />
      <line x1={10} y1={28} x2={10} y2={21} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={74} y1={28} x2={74} y2={21} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* thickness (right) */}
      <DimArrow x1={82} y1={28} x2={82} y2={44} label="t" side="right" />
      <line x1={74} y1={28} x2={82} y2={28} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={74} y1={44} x2={82} y2={44} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function PlateDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={10} y={18} width={64} height={36} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={1} />
      {/* width (top) */}
      <DimArrow x1={10} y1={11} x2={74} y2={11} label="w" side="top" />
      <line x1={10} y1={18} x2={10} y2={11} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={74} y1={18} x2={74} y2={11} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* thickness (right) */}
      <DimArrow x1={82} y1={18} x2={82} y2={54} label="t" side="right" />
      <line x1={74} y1={18} x2={82} y2={18} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={74} y1={54} x2={82} y2={54} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function ChequeredPlateDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      {/* base plate */}
      <rect x={10} y={28} width={60} height={22} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={1} />
      {/* pattern diamonds */}
      <g opacity={0.5}>
        <path d="M20,28 l3,-5 l3,5" fill={SHAPE_STROKE} stroke="none" />
        <path d="M32,28 l3,-5 l3,5" fill={SHAPE_STROKE} stroke="none" />
        <path d="M44,28 l3,-5 l3,5" fill={SHAPE_STROKE} stroke="none" />
        <path d="M56,28 l3,-5 l3,5" fill={SHAPE_STROKE} stroke="none" />
      </g>
      {/* width (top) */}
      <DimArrow x1={10} y1={15} x2={70} y2={15} label="w" side="top" />
      <line x1={10} y1={23} x2={10} y2={15} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={70} y1={23} x2={70} y2={15} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* base thickness (right) */}
      <DimArrow x1={78} y1={28} x2={78} y2={50} label="t" side="right" />
      <line x1={70} y1={28} x2={78} y2={28} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={70} y1={50} x2={78} y2={50} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* pattern height (left) */}
      <DimArrow x1={5} y1={23} x2={5} y2={28} label="p" side="left" />
    </svg>
  );
}

function ExpandedMetalDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      <rect x={10} y={24} width={64} height={24} fill={SHAPE_FILL} stroke={SHAPE_STROKE} strokeWidth={1.5} rx={1} />
      {/* expanded mesh pattern */}
      <g opacity={0.35} stroke={SHAPE_STROKE} strokeWidth={0.8} fill="none">
        <path d="M18,30 l5,6 l5,-6 l5,6 l5,-6 l5,6 l5,-6 l5,6 l5,-6" />
        <path d="M18,38 l5,6 l5,-6 l5,6 l5,-6 l5,6 l5,-6 l5,6 l5,-6" />
      </g>
      {/* width (top) */}
      <DimArrow x1={10} y1={17} x2={74} y2={17} label="w" side="top" />
      <line x1={10} y1={24} x2={10} y2={17} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={74} y1={24} x2={74} y2={17} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* thickness (right) */}
      <DimArrow x1={82} y1={24} x2={82} y2={48} label="t" side="right" />
      <line x1={74} y1={24} x2={82} y2={24} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={74} y1={48} x2={82} y2={48} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
    </svg>
  );
}

function CorrugatedSheetDiagram() {
  return (
    <svg viewBox="0 0 100 72" className="w-full h-full">
      <ArrowDefs />
      {/* corrugated profile */}
      <path
        d="M10,36 c4,-12 8,-12 12,0 c4,12 8,12 12,0 c4,-12 8,-12 12,0 c4,12 8,12 12,0 c4,-12 8,-12 12,0"
        fill="none" stroke={SHAPE_STROKE} strokeWidth={3} strokeLinecap="round"
      />
      {/* width (bottom) */}
      <DimArrow x1={10} y1={58} x2={70} y2={58} label="w" side="bottom" />
      <line x1={10} y1={48} x2={10} y2={58} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      <line x1={70} y1={48} x2={70} y2={58} stroke={DIM_FAINT} strokeWidth={0.5} strokeDasharray="2 1" />
      {/* thickness indicator */}
      <text x={80} y={38} fill={DIM_COLOR} fontSize={7} fontWeight={600} fontFamily="var(--font-sans)">t</text>
    </svg>
  );
}

const DIAGRAM_MAP: Partial<Record<ProfileId, () => React.ReactNode>> = {
  round_bar: RoundBarDiagram,
  square_bar: SquareBarDiagram,
  flat_bar: FlatBarDiagram,
  angle: AngleDiagram,
  pipe: PipeDiagram,
  rectangular_tube: RectangularTubeDiagram,
  square_hollow: SquareHollowDiagram,
  sheet: SheetDiagram,
  plate: PlateDiagram,
  chequered_plate: ChequeredPlateDiagram,
  expanded_metal: ExpandedMetalDiagram,
  corrugated_sheet: CorrugatedSheetDiagram,
};

export const ProfileDiagram = memo(function ProfileDiagram({
  profileId,
  className = "",
}: ProfileDiagramProps) {
  const DiagramComponent = DIAGRAM_MAP[profileId];
  if (!DiagramComponent) return null;

  return (
    <div className={`flex items-center justify-center rounded-lg bg-surface-inset border border-border-faint p-2 ${className}`}>
      <DiagramComponent />
    </div>
  );
});
