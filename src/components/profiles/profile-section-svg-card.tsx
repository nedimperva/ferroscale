"use client";

import { memo, useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { ProfileId } from "@/lib/datasets/types";
import {
  buildProfileDimensionRows,
  findManualRow,
  type ProfileDimensionRow,
} from "@/lib/profiles/profile-dimension-rows";
import { ProfileGeometryPrimitives } from "./profile-geometry-diagram";

const DRAW_W = 62;
const DRAW_H = 54;
const GEO = 48;

function DimLineH({
  x1,
  x2,
  y,
  text,
}: {
  x1: number;
  x2: number;
  y: number;
  text: string;
}) {
  const t = 2.2;
  return (
    <g
      stroke="currentColor"
      strokeOpacity={0.4}
      strokeWidth={0.85}
      fill="currentColor"
      fillOpacity={0.82}
    >
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - t} x2={x1} y2={y + t} />
      <line x1={x2} y1={y - t} x2={x2} y2={y + t} />
      <text
        x={(x1 + x2) / 2}
        y={y + 5.2}
        textAnchor="middle"
        fontSize={4.2}
        fontFamily="ui-monospace, system-ui, sans-serif"
        stroke="none"
      >
        {text}
      </text>
    </g>
  );
}

function DimLineV({
  x,
  y1,
  y2,
  text,
  textX,
}: {
  x: number;
  y1: number;
  y2: number;
  text: string;
  textX: number;
}) {
  const t = 2.2;
  const ym = (y1 + y2) / 2;
  return (
    <g
      stroke="currentColor"
      strokeOpacity={0.4}
      strokeWidth={0.85}
      fill="currentColor"
      fillOpacity={0.82}
    >
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x - t} y1={y1} x2={x + t} y2={y1} />
      <line x1={x - t} y1={y2} x2={x + t} y2={y2} />
      <text
        x={textX}
        y={ym + 1.5}
        textAnchor="start"
        fontSize={4.2}
        fontFamily="ui-monospace, system-ui, sans-serif"
        stroke="none"
      >
        {text}
      </text>
    </g>
  );
}

function GeometryAnnotations({
  profileId,
  rows,
}: {
  profileId: ProfileId;
  rows: ProfileDimensionRow[];
}) {
  const dia = findManualRow(rows, "diameter");
  const od = findManualRow(rows, "outerDiameter");
  const side = findManualRow(rows, "side");
  const width = findManualRow(rows, "width");
  const height = findManualRow(rows, "height");

  switch (profileId) {
    case "round_bar":
      return dia ? <DimLineH x1={11.5} x2={36.5} y={38.5} text={`Ø ${dia.display}`} /> : null;
    case "pipe":
      return od ? <DimLineH x1={11.5} x2={36.5} y={38.5} text={`OD ${od.display}`} /> : null;
    case "square_bar":
    case "square_hollow":
      return side ? <DimLineH x1={13.5} x2={34.5} y={36.5} text={side.display} /> : null;
    case "flat_bar":
      return width ? <DimLineH x1={7} x2={41} y={17.5} text={width.display} /> : null;
    case "sheet":
    case "plate":
    case "chequered_plate":
    case "expanded_metal":
    case "corrugated_sheet":
      return width ? <DimLineH x1={7} x2={41} y={profileId === "sheet" ? 19 : 16} text={width.display} /> : null;
    case "rectangular_tube":
      if (!width || !height) return null;
      return (
        <>
          <DimLineH x1={9.5} x2={38.5} y={38.5} text={width.display} />
          <DimLineV x={40.5} y1={11.5} y2={36.5} text={height.display} textX={43} />
        </>
      );
    default:
      return null;
  }
}

function rowLabel(
  row: ProfileDimensionRow,
  tResult: ReturnType<typeof useTranslations>,
  tDataset: ReturnType<typeof useTranslations>,
): string {
  if (row.kind === "manual") {
    return tDataset(`dimensions.${row.key}`);
  }
  if (row.kind === "designation") {
    return tResult("sectionDesignation");
  }
  if (row.key === "A") {
    return tResult("sectionArea");
  }
  return tResult("sectionLength");
}

/**
 * Single SVG “drawing sheet” fragment: border, scaled section, optional dimension lines, data list.
 */
export const ProfileSectionSvgCard = memo(function ProfileSectionSvgCard({
  profileId,
  input,
  result,
  subtitle,
}: {
  profileId: ProfileId;
  input: CalculationInput;
  result: CalculationResult;
  subtitle: string;
}) {
  const tResult = useTranslations("result");
  const tDataset = useTranslations("dataset");
  const gridPatternId = `section-grid-${useId().replace(/:/g, "")}`;

  const rows = useMemo(() => buildProfileDimensionRows(input, result), [input, result]);

  const s = Math.min(DRAW_W / GEO, DRAW_H / GEO);
  const ox = 6 + (DRAW_W - GEO * s) / 2;
  const oy = 22 + (DRAW_H - GEO * s) / 2;

  const lineH = rows.length > 7 ? 6.8 : 7.6;
  const vbH = Math.max(94, Math.min(152, 22 + DRAW_H + 12 + rows.length * lineH + 14));
  const tableX = 72;
  const tableTitleY = 24;
  const tableBodyY = tableTitleY + 9;

  const sub = subtitle.length > 28 ? `${subtitle.slice(0, 26)}…` : subtitle;

  return (
    <svg
      viewBox={`0 0 132 ${vbH}`}
      className="h-auto w-full max-w-full text-muted"
      role="img"
      aria-label={tResult("sectionCardAria", { profile: sub })}
    >
      <defs>
        <pattern id={gridPatternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M8 0H0V8"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={0.4}
          />
        </pattern>
      </defs>

      <rect x="0.5" y="0.5" width="131" height={vbH - 1} rx="1.5" fill={`url(#${gridPatternId})`} />
      <rect
        x="0.5"
        y="0.5"
        width="131"
        height={vbH - 1}
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.22}
        strokeWidth={0.75}
      />
      <rect
        x="2"
        y="2"
        width="128"
        height={vbH - 4}
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.38}
        strokeWidth={0.5}
      />

      <text
        x={6}
        y={9}
        fill="currentColor"
        fillOpacity={0.45}
        fontSize={5.5}
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.06em"
      >
        {tResult("sectionSubtitle")}
      </text>
      <text
        x={6}
        y={17}
        fill="currentColor"
        fillOpacity={0.88}
        fontSize={7.5}
        fontWeight={600}
        fontFamily="system-ui, sans-serif"
      >
        {sub}
      </text>

      <line
        x1={68}
        y1={20}
        x2={68}
        y2={vbH - 8}
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeWidth={0.5}
      />

      <g transform={`translate(${ox},${oy}) scale(${s})`}>
        <ProfileGeometryPrimitives profileId={profileId} />
        <GeometryAnnotations profileId={profileId} rows={rows} />
      </g>

      <text
        x={tableX}
        y={tableTitleY}
        fill="currentColor"
        fillOpacity={0.42}
        fontSize={5.5}
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.04em"
      >
        {tResult("sectionDataTitle")}
      </text>

      {rows.map((row, i) => (
        <text
          key={`${row.kind}-${"key" in row ? row.key : row.kind}-${i}`}
          x={tableX}
          y={tableBodyY + i * lineH}
          fill="currentColor"
          fillOpacity={0.88}
          fontSize={rows.length > 7 ? 5.9 : 6.5}
          fontFamily="ui-monospace, system-ui, sans-serif"
        >
          <tspan fontWeight={600} fillOpacity={0.72}>
            {rowLabel(row, tResult, tDataset)}
          </tspan>
          <tspan fillOpacity={0.35}> · </tspan>
          <tspan>{row.display}</tspan>
        </text>
      ))}
    </svg>
  );
});
