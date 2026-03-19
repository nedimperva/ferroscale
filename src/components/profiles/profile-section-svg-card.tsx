"use client";

import { memo, useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { ProfileId } from "@/lib/datasets/types";
import {
  buildProfileDimensionRows,
  findManualRow,
  getSelectedSectionMm,
  type ProfileDimensionRow,
} from "@/lib/profiles/profile-dimension-rows";
import {
  beamFlangeWidthGuide,
  beamSectionDimGuide,
  parseStandardSizeGeometry,
} from "@/lib/profiles/standard-size-geometry";
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
  textAnchor = "start",
}: {
  x: number;
  y1: number;
  y2: number;
  text: string;
  textX: number;
  textAnchor?: "start" | "middle" | "end";
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
        textAnchor={textAnchor}
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
  input,
}: {
  profileId: ProfileId;
  rows: ProfileDimensionRow[];
  input: CalculationInput;
}) {
  const t = useTranslations("result");
  const sectionMm = getSelectedSectionMm(input);
  const desRow = rows.find((r): r is Extract<ProfileDimensionRow, { kind: "designation" }> => r.kind === "designation");
  const stdGeo = desRow ? parseStandardSizeGeometry(profileId, desRow.display) : {};

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
    case "angle": {
      const legA = findManualRow(rows, "legA");
      const legB = findManualRow(rows, "legB");
      if (!legA || !legB) return null;
      return (
        <>
          <DimLineH x1={10} x2={36} y={41.5} text={legA.display} />
          <DimLineV x={38} y1={10} y2={35} text={legB.display} textX={40.5} />
        </>
      );
    }
    default:
      break;
  }

  if (profileId.startsWith("beam_") && sectionMm) {
    const g = beamSectionDimGuide(profileId);
    const fw = beamFlangeWidthGuide(profileId);
    return (
      <>
        <DimLineH
          x1={fw.x1}
          x2={fw.x2}
          y={5.4}
          text={t("sectionFlangeWidthDim", { value: sectionMm.b })}
        />
        <DimLineV
          x={g.vx}
          y1={g.y1}
          y2={g.y2}
          text={t("sectionDepthDim", { value: sectionMm.h })}
          textX={g.vx + 2}
        />
      </>
    );
  }

  if ((profileId === "channel_upn_en" || profileId === "channel_upe_en") && sectionMm) {
    return (
      <>
        <DimLineH x1={11} x2={31} y={5.5} text={t("sectionFlangeWidthDim", { value: sectionMm.b })} />
        <DimLineV
          x={36}
          y1={8}
          y2={40}
          text={t("sectionDepthDim", { value: sectionMm.h })}
          textX={38.2}
        />
      </>
    );
  }

  if (profileId === "tee_en" && sectionMm) {
    const legH = t("sectionTeeLegDim", { value: sectionMm.h });
    const legB = t("sectionTeeLegDim", { value: sectionMm.b });
    const tStr = t("sectionTeeThicknessDim", { value: sectionMm.tf });
    return (
      <>
        <DimLineH x1={7} x2={41} y={6} text={legH} />
        <DimLineV x={42.5} y1={14.5} y2={38} text={legB} textX={44.5} />
        <text
          x={24}
          y={47}
          textAnchor="middle"
          fontSize={3.8}
          fill="currentColor"
          fillOpacity={0.72}
          fontFamily="ui-monospace, system-ui, sans-serif"
        >
          {tStr}
        </text>
      </>
    );
  }

  if (profileId.startsWith("beam_") && stdGeo.depthMm != null) {
    const g = beamSectionDimGuide(profileId);
    return (
      <DimLineV
        x={g.vx}
        y1={g.y1}
        y2={g.y2}
        text={t("sectionDepthDim", { value: stdGeo.depthMm })}
        textX={g.vx + 2}
      />
    );
  }

  if ((profileId === "channel_upn_en" || profileId === "channel_upe_en") && stdGeo.depthMm != null) {
    return (
      <DimLineV
        x={36}
        y1={8}
        y2={40}
        text={t("sectionDepthDim", { value: stdGeo.depthMm })}
        textX={38.2}
      />
    );
  }

  if (profileId === "tee_en" && stdGeo.legMm != null) {
    const legText = t("sectionTeeLegDim", { value: stdGeo.legMm });
    const tStr =
      stdGeo.thicknessMm != null
        ? t("sectionTeeThicknessDim", { value: stdGeo.thicknessMm })
        : "";
    return (
      <>
        <DimLineH x1={7} x2={41} y={6} text={legText} />
        <DimLineV x={42.5} y1={14.5} y2={38} text={legText} textX={44.5} />
        {tStr ? (
          <text
            x={24}
            y={47}
            textAnchor="middle"
            fontSize={3.8}
            fill="currentColor"
            fillOpacity={0.72}
            fontFamily="ui-monospace, system-ui, sans-serif"
          >
            {tStr}
          </text>
        ) : null}
      </>
    );
  }

  return null;
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
  if (row.kind === "sectionDim") {
    const labels = { h: "sectionDimH", b: "sectionDimB", tw: "sectionDimTw", tf: "sectionDimTf" } as const;
    return tResult(labels[row.field]);
  }
  if (row.kind === "derived" && row.key === "A") {
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
        <GeometryAnnotations profileId={profileId} rows={rows} input={input} />
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
          key={
            row.kind === "manual"
              ? `m-${row.key}`
              : row.kind === "designation"
                ? "des"
                : row.kind === "sectionDim"
                  ? `sec-${row.field}`
                  : row.kind === "derived"
                    ? `d-${row.key}`
                    : `r-${i}`
          }
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
