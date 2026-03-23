"use client";

import { memo, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CalculationInput } from "@/lib/calculator/types";
import type {
  DimensionKey,
  ProfileId,
  ProfileSpecDrawingKind,
  ProfileSpecGeometry,
} from "@/lib/datasets/types";
import { getProfileById } from "@/lib/datasets/profiles";
import { ReferenceList } from "@/components/calculator/reference-list";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import {
  resolveProfileSpecs,
  type ProfileSpecsFamilyRow,
  type ProfileSpecsMetric,
  type ProfileSpecsMetricKey,
} from "@/lib/calculator/profile-specs";

interface ProfileSpecsPanelProps {
  input: CalculationInput;
  onSelectStandardSize: (sizeId: string) => void;
  onSelectManualDimensionsMm: (dimensions: Partial<Record<DimensionKey, number>>) => void;
}

type TranslateFn = (key: string, values?: Record<string, string | number | Date>) => string;

function formatNumber(locale: string, value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

function metricLabel(
  key: ProfileSpecsMetricKey,
  tBase: TranslateFn,
  tSpecs: TranslateFn,
): string {
  const dimensionKeys = new Set<DimensionKey>([
    "diameter",
    "side",
    "width",
    "height",
    "thickness",
    "outerDiameter",
    "wallThickness",
    "patternHeight",
    "legA",
    "legB",
  ]);

  if (dimensionKeys.has(key as DimensionKey)) {
    return tBase(`dataset.dimensions.${key}`);
  }

  return tSpecs(`labels.${key}`);
}

function metricValue(locale: string, metric: ProfileSpecsMetric): string {
  const digits = metric.unit === "mm2" ? 0 : metric.unit === "kg/m" ? 3 : 2;
  return `${formatNumber(locale, metric.value, digits)} ${metric.unit}`;
}

function drawingMetricText(key: ProfileSpecsMetricKey, valueText: string): string {
  switch (key) {
    case "diameter":
      return `d ${valueText}`;
    case "outerDiameter":
      return `OD ${valueText}`;
    case "innerDiameter":
      return `ID ${valueText}`;
    case "wallThickness":
    case "thickness":
      return `t ${valueText}`;
    case "side":
      return `a ${valueText}`;
    case "width":
      return `b ${valueText}`;
    case "height":
      return `h ${valueText}`;
    case "patternHeight":
      return `p ${valueText}`;
    case "legA":
      return `a ${valueText}`;
    case "legB":
      return `b ${valueText}`;
    case "webThickness":
      return `tw ${valueText}`;
    case "flangeThickness":
      return `tf ${valueText}`;
    case "rootRadius":
      return `r ${valueText}`;
    case "waveHeight":
      return `hw ${valueText}`;
    case "wavePitch":
      return `p ${valueText}`;
    case "meshPitch":
      return `m ${valueText}`;
    case "strandWidth":
      return `s ${valueText}`;
    default:
      return valueText;
  }
}

function badgeClass(selected: boolean): string {
  return selected
    ? "border-blue-border bg-blue-surface text-blue-text"
    : "border-border bg-surface text-foreground-secondary";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scaleSection(
  geometry: ProfileSpecGeometry,
  maxWidth: number,
  maxHeight: number,
): {
  width: number;
  height: number;
  web: number;
  flange: number;
  radius: number;
} {
  const widthMm = geometry.widthMm ?? geometry.sideMm ?? 120;
  const heightMm = geometry.heightMm ?? geometry.sideMm ?? 120;
  const scale = Math.min(maxWidth / Math.max(widthMm, 1), maxHeight / Math.max(heightMm, 1));

  return {
    width: clamp(widthMm * scale, 84, maxWidth),
    height: clamp(heightMm * scale, 88, maxHeight),
    web: clamp((geometry.webThicknessMm ?? geometry.wallThicknessMm ?? geometry.thicknessMm ?? 8) * scale * 1.85, 10, maxWidth * 0.32),
    flange: clamp((geometry.flangeThicknessMm ?? geometry.thicknessMm ?? 12) * scale * 1.7, 14, maxHeight * 0.28),
    radius: clamp((geometry.rootRadiusMm ?? 8) * scale * 1.6, 4, 18),
  };
}

function buildParallelIPath(x: number, y: number, width: number, height: number, web: number, flange: number): string {
  const xLeft = x;
  const xRight = x + width;
  const yTop = y;
  const yBottom = y + height;
  const xWebLeft = x + ((width - web) / 2);
  const xWebRight = xWebLeft + web;
  const yTopFlange = y + flange;
  const yBottomFlange = yBottom - flange;

  return [
    `M${xLeft} ${yTop}`,
    `H${xRight}`,
    `V${yTopFlange}`,
    `H${xWebRight}`,
    `V${yBottomFlange}`,
    `H${xRight}`,
    `V${yBottom}`,
    `H${xLeft}`,
    `V${yBottomFlange}`,
    `H${xWebLeft}`,
    `V${yTopFlange}`,
    `H${xLeft}`,
    "Z",
  ].join("");
}

function buildTaperedIPath(x: number, y: number, width: number, height: number, web: number, flange: number, taper: number): string {
  const xLeft = x;
  const xRight = x + width;
  const yTop = y;
  const yBottom = y + height;
  const xCenter = x + (width / 2);
  const xWebLeft = xCenter - (web / 2);
  const xWebRight = xCenter + (web / 2);
  const yFlangeOuter = yTop + flange;
  const yFlangeInner = yTop + (flange * 0.7);
  const yBottomFlangeOuter = yBottom - flange;
  const yBottomFlangeInner = yBottom - (flange * 0.7);

  return [
    `M${xLeft} ${yTop}`,
    `H${xRight}`,
    `V${yFlangeOuter}`,
    `L${xWebRight + taper} ${yFlangeInner}`,
    `H${xWebRight}`,
    `V${yBottomFlangeInner}`,
    `H${xWebRight + taper}`,
    `L${xRight} ${yBottomFlangeOuter}`,
    `V${yBottom}`,
    `H${xLeft}`,
    `V${yBottomFlangeOuter}`,
    `L${xWebLeft - taper} ${yBottomFlangeInner}`,
    `H${xWebLeft}`,
    `V${yFlangeInner}`,
    `H${xWebLeft - taper}`,
    `L${xLeft} ${yFlangeOuter}`,
    "Z",
  ].join("");
}

function buildParallelChannelPath(x: number, y: number, width: number, height: number, web: number, flange: number): string {
  const xLeft = x;
  const xRight = x + width;
  const yTop = y;
  const yBottom = y + height;
  const xWebRight = x + web;
  const yTopFlange = y + flange;
  const yBottomFlange = yBottom - flange;

  return [
    `M${xLeft} ${yTop}`,
    `H${xRight}`,
    `V${yTopFlange}`,
    `H${xWebRight}`,
    `V${yBottomFlange}`,
    `H${xRight}`,
    `V${yBottom}`,
    `H${xLeft}`,
    "Z",
  ].join("");
}

function buildTaperedChannelPath(x: number, y: number, width: number, height: number, web: number, flange: number, taper: number): string {
  const xLeft = x;
  const xRight = x + width;
  const yTop = y;
  const yBottom = y + height;
  const xWebRight = x + web;
  const yFlangeOuter = yTop + flange;
  const yFlangeInner = yTop + (flange * 0.72);
  const yBottomFlangeOuter = yBottom - flange;
  const yBottomFlangeInner = yBottom - (flange * 0.72);

  return [
    `M${xLeft} ${yTop}`,
    `H${xRight}`,
    `V${yFlangeOuter}`,
    `L${xWebRight + taper} ${yFlangeInner}`,
    `H${xWebRight}`,
    `V${yBottomFlangeInner}`,
    `H${xWebRight + taper}`,
    `L${xRight} ${yBottomFlangeOuter}`,
    `V${yBottom}`,
    `H${xLeft}`,
    "Z",
  ].join("");
}

function buildCorrugatedPath(thickness: number): string {
  const crestY = 104;
  const troughY = 146;
  const bottomOffset = clamp(thickness * 2.3, 8, 12);
  const points = [
    [32, troughY],
    [48, crestY],
    [72, crestY],
    [88, troughY],
    [116, troughY],
    [132, crestY],
    [156, crestY],
    [172, troughY],
    [200, troughY],
    [216, crestY],
    [228, crestY],
  ] as const;

  const topPath = points.map(([px, py], index) => `${index === 0 ? "M" : "L"}${px} ${py}`).join("");
  const bottomPath = [...points].reverse().map(([px, py]) => `L${px} ${py + bottomOffset}`).join("");

  return `${topPath}${bottomPath}Z`;
}

export const ProfileSpecsPanel = memo(function ProfileSpecsPanel({
  input,
  onSelectStandardSize,
  onSelectManualDimensionsMm,
}: ProfileSpecsPanelProps) {
  const locale = useLocale();
  const tBase = useTranslations();
  const tSpecs = useTranslations("specs");
  const specs = useMemo(() => resolveProfileSpecs(input), [input]);
  const profile = useMemo(() => getProfileById(input.profileId), [input.profileId]);

  if (!specs || !profile) return null;

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <div className="sticky top-0 z-10 border-b border-border-faint bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-surface text-blue-text">
            <ProfileIcon category={profile.category} className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground">{tSpecs("title")}</h2>
              {specs.isCustomSelection && (
                <span className="rounded-full border border-amber-border bg-amber-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-text">
                  {tSpecs("customSelection")}
                </span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-foreground-secondary">{specs.selectedLabel}</p>
            <p className="truncate text-xs text-muted">{tBase(`dataset.profiles.${specs.profileId}`)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          {specs.geometry && specs.drawingKind ? (
            <ProfileSpecsDrawing
              profileId={specs.profileId}
              drawingKind={specs.drawingKind}
              geometry={specs.geometry}
            />
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-8 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset text-muted-faint">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                  <path d="M12 3v18M3 12h18" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-foreground-secondary">{tSpecs("incompleteTitle")}</p>
              <p className="max-w-sm text-xs text-muted-faint">{tSpecs("incompleteBody")}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{tSpecs("metricsTitle")}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(!specs.isCustomSelection)}`}>
              {specs.isCustomSelection ? tSpecs("customSelection") : tSpecs("matchedSelection")}
            </span>
          </div>

          {specs.metrics.length > 0 ? (
            <dl className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(9.25rem,1fr))]">
              {specs.metrics.map((metric) => (
                <div key={`${metric.key}-${metric.value}`} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-faint">
                    {metricLabel(metric.key, tBase, tSpecs)}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {metricValue(locale, metric)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-faint">{tSpecs("metricsEmpty")}</p>
          )}
        </section>

        <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-faint">
              {tSpecs("formulaLabel")}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground-secondary">{specs.formulaLabel}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <ReferenceList
              labels={specs.referenceLabels}
              className="text-xs text-muted-faint"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{tSpecs("familyTableTitle")}</h3>
              <p className="text-xs text-muted-faint">{tSpecs("familyTableHint")}</p>
            </div>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {specs.familyRows.length}
            </span>
          </div>

          {specs.familyRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-faint">
                    <th className="px-3 py-1">{tSpecs("table.size")}</th>
                    <th className="px-3 py-1 text-right">{tSpecs("table.area")}</th>
                    <th className="px-3 py-1 text-right">{tSpecs("table.perimeter")}</th>
                    <th className="px-3 py-1 text-right">{tSpecs("table.massPerMeter")}</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.familyRows.map((row) => (
                    <SpecsFamilyRowButton
                      key={row.id}
                      locale={locale}
                      row={row}
                      onClick={() => {
                        if (row.mode === "standard" && row.sizeId) {
                          onSelectStandardSize(row.sizeId);
                          return;
                        }

                        if (row.mode === "manual" && row.dimensionsMm) {
                          onSelectManualDimensionsMm(row.dimensionsMm);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-faint">{tSpecs("noLookupRows")}</p>
          )}
        </section>
      </div>
    </div>
  );
});

function SpecsFamilyRowButton({
  locale,
  row,
  onClick,
}: {
  locale: string;
  row: ProfileSpecsFamilyRow;
  onClick: () => void;
}) {
  return (
    <tr className="group">
      <td colSpan={4} className="p-0">
        <button
          type="button"
          onClick={onClick}
          className={`grid w-full grid-cols-[minmax(9rem,1fr)_5.5rem_6rem_5rem] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
            row.selected
              ? "border-blue-border bg-blue-surface/60 text-blue-text"
              : "border-border bg-surface hover:bg-surface-inset"
          }`}
        >
          <span className="min-w-0 truncate text-sm font-medium">{row.label}</span>
          <span className="text-right text-xs font-semibold tabular-nums">
            {row.areaMm2 != null ? formatNumber(locale, row.areaMm2, 0) : "-"}
          </span>
          <span className="text-right text-xs font-semibold tabular-nums">
            {row.perimeterMm != null ? formatNumber(locale, row.perimeterMm, 0) : "-"}
          </span>
          <span className="text-right text-xs font-semibold tabular-nums">
            {row.massPerMeterKg != null ? formatNumber(locale, row.massPerMeterKg, 3) : "-"}
          </span>
        </button>
      </td>
    </tr>
  );
}

export const ProfileSpecsDrawing = memo(function ProfileSpecsDrawing({
  profileId,
  drawingKind,
  geometry,
}: {
  profileId: ProfileId;
  drawingKind: ProfileSpecDrawingKind;
  geometry: ProfileSpecGeometry;
}) {
  const locale = useLocale();
  const tSpecs = useTranslations("specs");
  const value = (raw: number | undefined) => (raw != null ? formatNumber(locale, raw, 1) : "-");
  const drawText = (key: ProfileSpecsMetricKey, raw: number | undefined) =>
    drawingMetricText(key, `${value(raw)} mm`);

  const angleLegA = geometry.legAMm ?? 80;
  const angleLegB = geometry.legBMm ?? 80;
  const angleThickness = geometry.thicknessMm ?? 8;
  const angleScale = Math.min(136 / Math.max(angleLegA, 1), 128 / Math.max(angleLegB, 1));
  const angleOuterWidth = clamp(angleLegA * angleScale, 72, 150);
  const angleOuterHeight = clamp(angleLegB * angleScale, 72, 138);
  const angleInnerThickness = clamp(angleThickness * angleScale * 2.1, 10, Math.min(angleOuterWidth, angleOuterHeight) - 16);
  const angleX0 = 58;
  const angleY0 = 54;
  const angleX1 = angleX0 + angleOuterWidth;
  const angleY1 = angleY0 + angleOuterHeight;

  const section = scaleSection(geometry, 156, 126);
  const sectionX = 130 - (section.width / 2);
  const sectionY = 112 - (section.height / 2);
  const sectionBottom = sectionY + section.height;
  const sectionCenter = sectionX + (section.width / 2);
  const sectionWebLeft = sectionCenter - (section.web / 2);
  const sectionWebRight = sectionCenter + (section.web / 2);
  const sectionTopFlange = sectionY + section.flange;
  const sectionBottomFlange = sectionBottom - section.flange;
  const ipnTaper = clamp(section.width * 0.12, 10, 20);
  const upnTaper = clamp(section.width * 0.15, 10, 22);
  const channelWeb = clamp(section.web * 1.08, 12, section.width * 0.34);
  const channelWebRight = sectionX + channelWeb;
  const teeTop = sectionY;
  const teeBottom = sectionBottom;
  const teeWebLeft = sectionCenter - (section.web / 2);
  const teeWebRight = sectionCenter + (section.web / 2);

  const corrugatedThickness = clamp((geometry.thicknessMm ?? 0.7) * 2.6, 8, 12);
  const corrugatedPath = buildCorrugatedPath(corrugatedThickness);

  return (
    <div className="bg-linear-to-b from-surface to-surface-raised/70 p-4">
      <svg viewBox="0 0 260 220" className="h-auto w-full text-blue-text" role="img" aria-label={tSpecs("drawingAria")}>
        <defs>
          <marker id="spec-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 8 4 0 8Z" fill="currentColor" />
          </marker>
          <pattern id="spec-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="2" opacity="0.18" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="260" height="220" fill="transparent" />

        {drawingKind === "round" && (
          <>
            <circle cx="130" cy="116" r="56" fill="url(#spec-hatch)" stroke="currentColor" strokeWidth="3" />
            <DimensionArrow x1={74} y1={44} x2={186} y2={44} />
            <GuideLine x1={74} y1={44} x2={74} y2={60} />
            <GuideLine x1={186} y1={44} x2={186} y2={60} />
            <DrawingLabel x={130} y={37} text={drawText("diameter", geometry.diameterMm)} />
          </>
        )}

        {drawingKind === "square" && (
          <>
            <rect x="72" y="58" width="116" height="116" fill="url(#spec-hatch)" stroke="currentColor" strokeWidth="3" />
            <DimensionArrow x1={72} y1={38} x2={188} y2={38} />
            <GuideLine x1={72} y1={38} x2={72} y2={58} />
            <GuideLine x1={188} y1={38} x2={188} y2={58} />
            <DrawingLabel x={130} y={31} text={drawText("side", geometry.sideMm)} />
          </>
        )}

        {(drawingKind === "flat" || drawingKind === "sheet" || drawingKind === "chequered" || drawingKind === "expanded" || drawingKind === "corrugated") && (
          <>
            {drawingKind === "corrugated" ? (
              <path d={corrugatedPath} fill="url(#spec-hatch)" stroke="currentColor" strokeWidth="3" />
            ) : drawingKind === "expanded" ? (
              <rect x="34" y="102" width="192" height="36" rx="8" fill="transparent" stroke="currentColor" strokeWidth="3" />
            ) : (
              <rect x="34" y="102" width="192" height="30" rx="4" fill="url(#spec-hatch)" stroke="currentColor" strokeWidth="3" />
            )}

            {drawingKind === "expanded" && (
              <>
                <path d="M50 120 66 108l16 12-16 12Z" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
                <path d="M92 120 108 108l16 12-16 12Z" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
                <path d="M134 120 150 108l16 12-16 12Z" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
                <path d="M176 120 192 108l16 12-16 12Z" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
              </>
            )}

            {drawingKind === "chequered" && (
              <>
                <path d="M72 102v30M112 102v30M152 102v30M192 102v30" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
                <DimensionArrow x1={230} y1={98} x2={230} y2={86} />
                <GuideLine x1={226} y1={102} x2={230} y2={102} />
                <GuideLine x1={226} y1={86} x2={230} y2={86} />
                <DrawingLabel x={214} y={82} text={drawText("patternHeight", geometry.patternHeightMm)} anchor="end" />
              </>
            )}

            {drawingKind === "expanded" && (
              <>
                <DimensionArrow x1={50} y1={88} x2={108} y2={88} />
                <GuideLine x1={50} y1={88} x2={50} y2={108} />
                <GuideLine x1={108} y1={88} x2={108} y2={108} />
                <DrawingLabel x={79} y={81} text={drawText("meshPitch", geometry.meshPitchMm)} />
                <DimensionArrow x1={208} y1={108} x2={192} y2={120} />
                <DrawingLabel x={212} y={106} text={drawText("strandWidth", geometry.strandWidthMm)} anchor="start" />
              </>
            )}

            {drawingKind === "corrugated" && (
              <>
                <DimensionArrow x1={48} y1={78} x2={132} y2={78} />
                <GuideLine x1={48} y1={78} x2={48} y2={104} />
                <GuideLine x1={132} y1={78} x2={132} y2={104} />
                <DrawingLabel x={90} y={71} text={drawText("wavePitch", geometry.wavePitchMm)} />
                <DimensionArrow x1={238} y1={146} x2={238} y2={104} />
                <GuideLine x1={228} y1={146} x2={238} y2={146} />
                <GuideLine x1={228} y1={104} x2={238} y2={104} />
                <DrawingLabel x={218} y={99} text={drawText("waveHeight", geometry.waveHeightMm)} anchor="end" />
              </>
            )}

            <DimensionArrow x1={34} y1={58} x2={226} y2={58} />
            <GuideLine x1={34} y1={58} x2={34} y2={102} />
            <GuideLine x1={226} y1={58} x2={226} y2={102} />
            <DrawingLabel x={130} y={51} text={drawText("width", geometry.widthMm)} />

            <DimensionArrow x1={248} y1={102} x2={248} y2={132} />
            <GuideLine x1={226} y1={102} x2={248} y2={102} />
            <GuideLine x1={226} y1={132} x2={248} y2={132} />
            <DrawingLabel x={236} y={149} text={drawText("thickness", geometry.thicknessMm)} anchor="end" />
          </>
        )}

        {drawingKind === "pipe" && (
          <>
            <circle cx="130" cy="116" r="58" fill="url(#spec-hatch)" stroke="currentColor" strokeWidth="3" />
            <circle cx="130" cy="116" r="40" fill="white" stroke="currentColor" strokeWidth="2" opacity="0.92" />
            <DimensionArrow x1={72} y1={44} x2={188} y2={44} />
            <GuideLine x1={72} y1={44} x2={72} y2={58} />
            <GuideLine x1={188} y1={44} x2={188} y2={58} />
            <DrawingLabel x={130} y={37} text={drawText("outerDiameter", geometry.outerDiameterMm)} />
            <DimensionArrow x1={188} y1={116} x2={170} y2={116} />
            <DrawingLabel x={202} y={111} text={drawText("wallThickness", geometry.wallThicknessMm)} anchor="start" />
          </>
        )}

        {drawingKind === "rect_hollow" && (
          <>
            <rect x="48" y="60" width="164" height="112" rx="10" fill="url(#spec-hatch)" stroke="currentColor" strokeWidth="3" />
            <rect x="80" y="84" width="100" height="64" rx="6" fill="white" stroke="currentColor" strokeWidth="2" opacity="0.92" />
            <DimensionArrow x1={48} y1={40} x2={212} y2={40} />
            <GuideLine x1={48} y1={40} x2={48} y2={60} />
            <GuideLine x1={212} y1={40} x2={212} y2={60} />
            <DrawingLabel x={130} y={33} text={drawText(geometry.sideMm != null ? "side" : "width", geometry.sideMm ?? geometry.widthMm)} />
            <DimensionArrow x1={26} y1={60} x2={26} y2={172} />
            <GuideLine x1={48} y1={60} x2={26} y2={60} />
            <GuideLine x1={48} y1={172} x2={26} y2={172} />
            <DrawingLabel x={30} y={116} text={drawText(geometry.sideMm != null ? "side" : "height", geometry.sideMm ?? geometry.heightMm)} vertical />
            <DimensionArrow x1={212} y1={84} x2={180} y2={84} />
            <DrawingLabel x={212} y={78} text={drawText("wallThickness", geometry.wallThicknessMm)} anchor="end" />
          </>
        )}

        {drawingKind === "angle" && (
          <>
            <path
              d={`M${angleX0} ${angleY0}H${angleX1}V${angleY0 + angleInnerThickness}H${angleX0 + angleInnerThickness}V${angleY1}H${angleX0}Z`}
              fill="url(#spec-hatch)"
              stroke="currentColor"
              strokeWidth="3"
            />
            <DimensionArrow x1={angleX0} y1={34} x2={angleX1} y2={34} />
            <GuideLine x1={angleX0} y1={34} x2={angleX0} y2={angleY0} />
            <GuideLine x1={angleX1} y1={34} x2={angleX1} y2={angleY0} />
            <DrawingLabel x={(angleX0 + angleX1) / 2} y={27} text={drawText("legA", geometry.legAMm)} />
            <DimensionArrow x1={34} y1={angleY0} x2={34} y2={angleY1} />
            <GuideLine x1={angleX0} y1={angleY0} x2={34} y2={angleY0} />
            <GuideLine x1={angleX0} y1={angleY1} x2={34} y2={angleY1} />
            <DrawingLabel x={24} y={(angleY0 + angleY1) / 2} text={drawText("legB", geometry.legBMm)} vertical />
            <DimensionArrow x1={angleX0} y1={angleY0 + angleInnerThickness + 20} x2={angleX0 + angleInnerThickness} y2={angleY0 + angleInnerThickness + 20} />
            <GuideLine x1={angleX0} y1={angleY0 + angleInnerThickness + 20} x2={angleX0} y2={angleY0 + angleInnerThickness} />
            <GuideLine x1={angleX0 + angleInnerThickness} y1={angleY0 + angleInnerThickness + 20} x2={angleX0 + angleInnerThickness} y2={angleY0 + angleInnerThickness} />
            <DrawingLabel x={angleX0 + angleInnerThickness + 18} y={angleY0 + angleInnerThickness + 15} text={drawText("thickness", geometry.thicknessMm)} anchor="start" />
          </>
        )}

        {drawingKind === "ibeam" && (
          <>
            <path
              d={profileId === "beam_ipn_en"
                ? buildTaperedIPath(sectionX, sectionY, section.width, section.height, section.web, section.flange, ipnTaper)
                : buildParallelIPath(sectionX, sectionY, section.width, section.height, section.web, section.flange)}
              fill="url(#spec-hatch)"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path d={`M${sectionWebRight} ${sectionTopFlange + section.radius} Q${sectionWebRight} ${sectionTopFlange} ${sectionWebRight + section.radius} ${sectionTopFlange}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
            <path d={`M${sectionWebLeft} ${sectionTopFlange + section.radius} Q${sectionWebLeft} ${sectionTopFlange} ${sectionWebLeft - section.radius} ${sectionTopFlange}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
            <DimensionArrow x1={sectionX} y1={32} x2={sectionX + section.width} y2={32} />
            <GuideLine x1={sectionX} y1={32} x2={sectionX} y2={sectionY} />
            <GuideLine x1={sectionX + section.width} y1={32} x2={sectionX + section.width} y2={sectionY} />
            <DrawingLabel x={130} y={25} text={drawText("width", geometry.widthMm)} />
            <DimensionArrow x1={24} y1={sectionY} x2={24} y2={sectionBottom} />
            <GuideLine x1={sectionX} y1={sectionY} x2={24} y2={sectionY} />
            <GuideLine x1={sectionX} y1={sectionBottom} x2={24} y2={sectionBottom} />
            <DrawingLabel x={18} y={112} text={drawText("height", geometry.heightMm)} vertical />
            <DimensionArrow x1={sectionWebLeft} y1={112} x2={sectionWebRight} y2={112} />
            <DrawingLabel x={sectionWebRight + 16} y={106} text={drawText("webThickness", geometry.webThicknessMm)} anchor="start" />
            <DimensionArrow x1={sectionX + section.width + 24} y1={sectionY} x2={sectionX + section.width + 24} y2={sectionTopFlange} />
            <GuideLine x1={sectionX + section.width} y1={sectionY} x2={sectionX + section.width + 24} y2={sectionY} />
            <GuideLine x1={sectionX + section.width} y1={sectionTopFlange} x2={sectionX + section.width + 24} y2={sectionTopFlange} />
            <DrawingLabel x={sectionX + section.width + 10} y={sectionTopFlange + 14} text={drawText("flangeThickness", geometry.flangeThicknessMm)} anchor="end" />
            <GuideLine x1={sectionWebRight + section.radius * 0.8} y1={sectionTopFlange + 2} x2={sectionWebRight + 24} y2={sectionTopFlange + 22} />
            <DrawingLabel x={sectionWebRight + 27} y={sectionTopFlange + 22} text={drawText("rootRadius", geometry.rootRadiusMm)} anchor="start" />
          </>
        )}

        {drawingKind === "channel" && (
          <>
            <path
              d={profileId === "channel_upn_en"
                ? buildTaperedChannelPath(sectionX, sectionY, section.width, section.height, channelWeb, section.flange, upnTaper)
                : buildParallelChannelPath(sectionX, sectionY, section.width, section.height, channelWeb, section.flange)}
              fill="url(#spec-hatch)"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path d={`M${channelWebRight} ${sectionTopFlange + section.radius} Q${channelWebRight} ${sectionTopFlange} ${channelWebRight + section.radius} ${sectionTopFlange}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
            <path d={`M${channelWebRight} ${sectionBottomFlange - section.radius} Q${channelWebRight} ${sectionBottomFlange} ${channelWebRight + section.radius} ${sectionBottomFlange}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
            <DimensionArrow x1={sectionX} y1={32} x2={sectionX + section.width} y2={32} />
            <GuideLine x1={sectionX} y1={32} x2={sectionX} y2={sectionY} />
            <GuideLine x1={sectionX + section.width} y1={32} x2={sectionX + section.width} y2={sectionY} />
            <DrawingLabel x={130} y={25} text={drawText("width", geometry.widthMm)} />
            <DimensionArrow x1={44} y1={sectionY} x2={44} y2={sectionBottom} />
            <GuideLine x1={sectionX} y1={sectionY} x2={44} y2={sectionY} />
            <GuideLine x1={sectionX} y1={sectionBottom} x2={44} y2={sectionBottom} />
            <DrawingLabel x={36} y={112} text={drawText("height", geometry.heightMm)} vertical />
            <DimensionArrow x1={sectionX} y1={112} x2={channelWebRight} y2={112} />
            <DrawingLabel x={channelWebRight + 15} y={106} text={drawText("webThickness", geometry.webThicknessMm)} anchor="start" />
            <DimensionArrow x1={sectionX + section.width + 18} y1={sectionY} x2={sectionX + section.width + 18} y2={sectionTopFlange} />
            <GuideLine x1={sectionX + section.width} y1={sectionY} x2={sectionX + section.width + 18} y2={sectionY} />
            <GuideLine x1={sectionX + section.width} y1={sectionTopFlange} x2={sectionX + section.width + 18} y2={sectionTopFlange} />
            <DrawingLabel x={sectionX + section.width + 4} y={sectionTopFlange + 14} text={drawText("flangeThickness", geometry.flangeThicknessMm)} anchor="end" />
            <GuideLine x1={channelWebRight + section.radius * 0.8} y1={sectionTopFlange + 2} x2={channelWebRight + 22} y2={sectionTopFlange + 22} />
            <DrawingLabel x={channelWebRight + 26} y={sectionTopFlange + 22} text={drawText("rootRadius", geometry.rootRadiusMm)} anchor="start" />
          </>
        )}

        {drawingKind === "tee" && (
          <>
            <path
              d={`M${sectionX} ${teeTop}H${sectionX + section.width}V${teeTop + section.flange}H${teeWebRight}V${teeBottom}H${teeWebLeft}V${teeTop + section.flange}H${sectionX}Z`}
              fill="url(#spec-hatch)"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path d={`M${teeWebRight} ${teeTop + section.flange + section.radius} Q${teeWebRight} ${teeTop + section.flange} ${teeWebRight + section.radius} ${teeTop + section.flange}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
            <path d={`M${teeWebLeft} ${teeTop + section.flange + section.radius} Q${teeWebLeft} ${teeTop + section.flange} ${teeWebLeft - section.radius} ${teeTop + section.flange}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
            <DimensionArrow x1={sectionX} y1={32} x2={sectionX + section.width} y2={32} />
            <GuideLine x1={sectionX} y1={32} x2={sectionX} y2={teeTop} />
            <GuideLine x1={sectionX + section.width} y1={32} x2={sectionX + section.width} y2={teeTop} />
            <DrawingLabel x={130} y={25} text={drawText("width", geometry.widthMm)} />
            <DimensionArrow x1={30} y1={teeTop} x2={30} y2={teeBottom} />
            <GuideLine x1={teeWebLeft} y1={teeBottom} x2={30} y2={teeBottom} />
            <GuideLine x1={sectionX} y1={teeTop} x2={30} y2={teeTop} />
            <DrawingLabel x={24} y={112} text={drawText("height", geometry.heightMm)} vertical />
            <DimensionArrow x1={teeWebLeft} y1={114} x2={teeWebRight} y2={114} />
            <DrawingLabel x={teeWebRight + 15} y={108} text={drawText("webThickness", geometry.webThicknessMm)} anchor="start" />
            <DimensionArrow x1={sectionX + section.width + 18} y1={teeTop} x2={sectionX + section.width + 18} y2={teeTop + section.flange} />
            <GuideLine x1={sectionX + section.width} y1={teeTop} x2={sectionX + section.width + 18} y2={teeTop} />
            <GuideLine x1={sectionX + section.width} y1={teeTop + section.flange} x2={sectionX + section.width + 18} y2={teeTop + section.flange} />
            <DrawingLabel x={sectionX + section.width + 5} y={teeTop + section.flange + 14} text={drawText("flangeThickness", geometry.flangeThicknessMm)} anchor="end" />
            <GuideLine x1={teeWebRight + section.radius * 0.8} y1={teeTop + section.flange + 2} x2={teeWebRight + 22} y2={teeTop + section.flange + 22} />
            <DrawingLabel x={teeWebRight + 26} y={teeTop + section.flange + 22} text={drawText("rootRadius", geometry.rootRadiusMm)} anchor="start" />
          </>
        )}
      </svg>
    </div>
  );
});

function DimensionArrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth="1.5"
      markerStart="url(#spec-arrow)"
      markerEnd="url(#spec-arrow)"
      opacity="0.88"
    />
  );
}

function GuideLine({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.2" opacity="0.42" />;
}

function DrawingLabel({
  x,
  y,
  text,
  anchor = "middle",
  vertical = false,
}: {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  vertical?: boolean;
}) {
  const width = Math.max(28, Math.round(text.length * 4.7 + 8));
  const height = 14;
  const rectX = anchor === "middle" ? x - (width / 2) : anchor === "end" ? x - width : x;
  const rectY = y - 10;

  return (
    <g transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}>
      <rect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        rx="4"
        fill="white"
        opacity="0.94"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeOpacity="0.16"
      />
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontSize="8.2"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
        fill="currentColor"
        opacity="0.96"
      >
        {text}
      </text>
    </g>
  );
}
