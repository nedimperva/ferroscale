"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  optimizeCutList,
  optimizePlateCutList,
  STANDARD_EURO_SHEET_FORMATS,
  type CutOptimizationResult,
  type CutPattern,
  type PlateOptimizationResult,
  type PlatePattern,
  type PlateSheetOption,
} from "@ferroscale/metal-core";
import type { Project } from "@/hooks/useProjects";
import { extractProjectCutGroups, type ProjectCutGroup } from "@/lib/projects/cutting";
import { DeskIcon } from "../desktop/desk-atoms";
import { EmptyState } from "../empty-state";
import { ProjectProcurement } from "./project-procurement";
import { ProjectCutSheetDoc } from "./project-print-docs";

interface ProjectCuttingProps {
  project: Project;
  compact?: boolean;
}

const STOCK_PRESETS = [
  { label: "6 m", value: 6000 },
  { label: "12 m", value: 12000 },
  { label: "6m + 12m", value: -1 }, // Mixed standard
];

const CUT_PALETTE = [
  { fill: "color-mix(in srgb, var(--accent) 24%, var(--surface))", stroke: "var(--accent)", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #3b82f6 22%, var(--surface))", stroke: "#3b82f6", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #10b981 22%, var(--surface))", stroke: "#10b981", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #f59e0b 24%, var(--surface))", stroke: "#f59e0b", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #8b5cf6 22%, var(--surface))", stroke: "#8b5cf6", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #ec4899 22%, var(--surface))", stroke: "#ec4899", text: "var(--foreground)" },
];

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "accent" | "green" | "muted";
}) {
  return (
    <div
      className="rounded-[14px] min-w-0"
      style={{
        padding: "10px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase truncate">
        {label}
      </div>
      <div
        className="font-mono font-bold mt-0.5 truncate"
        style={{
          fontSize: 16,
          color:
            tone === "accent"
              ? "var(--accent-text)"
              : tone === "green"
                ? "var(--green-strong, #10b981)"
                : "var(--foreground)",
        }}
      >
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function BarSvgDiagram({
  pattern,
  kerfMm,
  barIndex,
}: {
  pattern: CutPattern;
  kerfMm: number;
  barIndex: number;
}) {
  const t = useTranslations("command");
  const totalStock = pattern.stockLengthMm;
  const vbW = 1000;
  const vbH = 40;

  const scale = (mm: number) => (totalStock > 0 ? (mm / totalStock) * vbW : 0);

  return (
    <div
      className="rounded-[14px] p-3.5 space-y-2.5"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      {/* Bar Header */}
      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="font-mono font-bold px-2 py-0.5 rounded-md text-[11px]"
            style={{ background: "var(--surface-inset)", border: "1px solid var(--border-faint)" }}
          >
            {t("cutting.barNumber", { number: barIndex + 1 })}
          </span>
          <span className="font-mono text-muted">
            {(pattern.stockLengthMm / 1000).toFixed(1)} m · {pattern.cuts.length} cuts
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11.5px]">
          <span className="text-muted">
            {t("cutting.used")}: <strong className="text-foreground">{pattern.usedLengthMm} mm</strong>
          </span>
          <span
            className="font-bold px-2 py-0.5 rounded-full text-[11px]"
            style={{
              background: pattern.utilizationPercent >= 85 ? "var(--green-surface, rgba(16,185,129,0.12))" : "var(--surface-inset)",
              color: pattern.utilizationPercent >= 85 ? "var(--green-strong, #10b981)" : "var(--foreground-secondary)",
            }}
          >
            {pattern.utilizationPercent}% {t("cutting.yield")}
          </span>
        </div>
      </div>

      {/* Scaled SVG Bar */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[var(--surface-inset)] border border-[var(--border-faint)]">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full block"
          style={{ height: "38px" }}
          preserveAspectRatio="none"
        >
          {pattern.cuts.map((cut, cIdx) => {
            const color = CUT_PALETTE[cIdx % CUT_PALETTE.length];
            const x = scale(cut.startMm);
            const w = Math.max(1, scale(cut.lengthMm));
            const isWideEnough = w >= 45;

            return (
              <g key={`cut-${cIdx}`}>
                <rect
                  x={x}
                  y={0}
                  width={w}
                  height={vbH}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={1}
                />
                {isWideEnough && (
                  <text
                    x={x + w / 2}
                    y={vbH / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--foreground)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                    className="select-none pointer-events-none"
                  >
                    #{cut.cutIndex}
                  </text>
                )}
                {cIdx < pattern.cuts.length - 1 && kerfMm > 0 && (
                  <rect
                    x={scale(cut.endMm)}
                    y={0}
                    width={Math.max(1.5, scale(kerfMm))}
                    height={vbH}
                    fill="var(--accent)"
                    opacity={0.7}
                  />
                )}
              </g>
            );
          })}

          {pattern.remnantMm > 0 && (
            <g>
              <rect
                x={scale(pattern.stockLengthMm - pattern.remnantMm)}
                y={0}
                width={Math.max(1, scale(pattern.remnantMm))}
                height={vbH}
                fill={pattern.isReusable ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)"}
                stroke={pattern.isReusable ? "#10b981" : "rgba(239,68,68,0.4)"}
                strokeWidth={1}
                strokeDasharray={pattern.isReusable ? "4 2" : undefined}
              />
              {scale(pattern.remnantMm) >= 70 && (
                <text
                  x={scale(pattern.stockLengthMm - pattern.remnantMm / 2)}
                  y={vbH / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={pattern.isReusable ? "#10b981" : "var(--muted)"}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  className="select-none pointer-events-none"
                >
                  {pattern.remnantMm} mm ({pattern.isReusable ? t("cutting.offcut") : t("cutting.scrap")})
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Cuts Table */}
      <div className="overflow-x-auto pt-1">
        <table className="w-full text-[11.5px] font-mono border-collapse">
          <thead>
            <tr className="text-muted text-[10px] uppercase border-b border-[var(--border-faint)] text-left">
              <th className="pb-1 font-semibold">{t("cutting.cutIndex")}</th>
              <th className="pb-1 font-semibold">{t("cutting.length")}</th>
              <th className="pb-1 font-semibold">{t("cutting.markOffset")}</th>
              <th className="pb-1 font-semibold">{t("cutting.partName")}</th>
            </tr>
          </thead>
          <tbody>
            {pattern.cuts.map((cut, idx) => (
              <tr
                key={`row-${idx}`}
                className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-inset)]"
              >
                <td className="py-1 text-muted">#{cut.cutIndex}</td>
                <td className="py-1 font-bold text-foreground">{cut.lengthMm} mm</td>
                <td className="py-1 text-muted">
                  {cut.startMm} → {cut.endMm} mm
                </td>
                <td className="py-1 text-foreground truncate max-w-[200px]">
                  {cut.label || `Piece ${idx + 1}`}
                </td>
              </tr>
            ))}
            {pattern.remnantMm > 0 && (
              <tr className="text-muted bg-[var(--surface-inset)]/50">
                <td className="py-1 font-semibold" colSpan={2}>
                  {pattern.isReusable ? `✨ ${t("cutting.reusableOffcut")}` : `🗑️ ${t("cutting.scrapRemainder")}`}
                </td>
                <td className="py-1 font-bold" colSpan={2}>
                  {pattern.remnantMm} mm ({t("cutting.remaining")})
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlateSvgDiagram({
  pattern,
  sheetIndex,
  edgeTrimMm,
}: {
  pattern: PlatePattern;
  sheetIndex: number;
  edgeTrimMm: number;
}) {
  const t = useTranslations("command");
  const sheetL = pattern.sheetLengthMm; // X axis (horizontal length)
  const sheetW = pattern.sheetWidthMm;  // Y axis (vertical width)

  return (
    <div
      className="rounded-[14px] p-3.5 space-y-2.5"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      {/* Plate Header */}
      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="font-mono font-bold px-2 py-0.5 rounded-md text-[11px]"
            style={{ background: "var(--surface-inset)", border: "1px solid var(--border-faint)" }}
          >
            {t("cutting.plateNumber", { number: sheetIndex + 1 })}
          </span>
          <span className="font-mono text-muted">
            {pattern.formatLabel} · {pattern.cuts.length} cuts
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11.5px]">
          <span className="text-muted">
            {t("cutting.used")}: <strong className="text-foreground">{pattern.usedAreaM2} m²</strong> / {pattern.totalAreaM2} m²
          </span>
          <span
            className="font-bold px-2 py-0.5 rounded-full text-[11px]"
            style={{
              background: pattern.utilizationPercent >= 75 ? "var(--green-surface, rgba(16,185,129,0.12))" : "var(--surface-inset)",
              color: pattern.utilizationPercent >= 75 ? "var(--green-strong, #10b981)" : "var(--foreground-secondary)",
            }}
          >
            {pattern.utilizationPercent}% {t("cutting.yield")}
          </span>
        </div>
      </div>

      {/* 2D SVG Master Plate Layout */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[var(--surface-inset)] border border-[var(--border-faint)] p-2">
        <svg
          viewBox={`0 0 ${sheetL} ${sheetW}`}
          className="w-full block"
          style={{ maxHeight: "360px" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Master sheet background (unutilized space is light scrap tint) */}
          <rect
            x={0}
            y={0}
            width={sheetL}
            height={sheetW}
            fill="rgba(239,68,68,0.06)"
            stroke="var(--border-faint)"
            strokeWidth={Math.max(2, sheetL / 1200)}
          />

          {/* Edge margin trim border */}
          {edgeTrimMm > 0 && (
            <rect
              x={edgeTrimMm}
              y={edgeTrimMm}
              width={Math.max(0, sheetL - 2 * edgeTrimMm)}
              height={Math.max(0, sheetW - 2 * edgeTrimMm)}
              fill="none"
              stroke="var(--border-faint)"
              strokeWidth={1}
              strokeDasharray="6 4"
            />
          )}

          {/* Placed rectangular cuts */}
          {pattern.cuts.map((cut, cIdx) => {
            const color = CUT_PALETTE[cIdx % CUT_PALETTE.length];
            const cutX = cut.xMm;
            const cutY = cut.yMm;
            const cutW = cut.dxMm; // width along X (length axis)
            const cutH = cut.dyMm; // height along Y (width axis)

            const minDim = Math.min(cutW, cutH);
            const badgeFontSize = Math.max(14, Math.min(36, minDim * 0.45));
            const showBadge = cutW >= 30 && cutH >= 20;

            return (
              <g key={`plate-cut-${cIdx}`}>
                <rect
                  x={cutX}
                  y={cutY}
                  width={cutW}
                  height={cutH}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={Math.max(1.5, sheetL / 1500)}
                  rx={Math.max(1, sheetL / 2000)}
                />
                {showBadge && (
                  <text
                    x={cutX + cutW / 2}
                    y={cutY + cutH / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--foreground)"
                    fontSize={badgeFontSize}
                    fontFamily="var(--font-mono)"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    #{cut.cutIndex}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2D Cut Schedule Table */}
      <div className="overflow-x-auto pt-1">
        <table className="w-full text-[11.5px] font-mono border-collapse">
          <thead>
            <tr className="text-muted text-[10px] uppercase border-b border-[var(--border-faint)] text-left">
              <th className="pb-1 font-semibold">{t("cutting.cutIndex")}</th>
              <th className="pb-1 font-semibold">{t("cutting.partName")}</th>
              <th className="pb-1 font-semibold">{t("cutting.dimensions")}</th>
              <th className="pb-1 font-semibold">{t("cutting.position")}</th>
              <th className="pb-1 font-semibold">{t("cutting.rotated")}</th>
              <th className="pb-1 font-semibold text-right">{t("cutting.area")}</th>
            </tr>
          </thead>
          <tbody>
            {pattern.cuts.map((cut, idx) => (
              <tr
                key={`p-row-${idx}`}
                className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-inset)]"
              >
                <td className="py-1 text-muted">#{cut.cutIndex}</td>
                <td className="py-1 font-bold text-foreground truncate max-w-[180px]">
                  {cut.label || `Part ${idx + 1}`}
                </td>
                <td className="py-1 text-foreground">{cut.widthMm} × {cut.lengthMm} mm</td>
                <td className="py-1 text-muted">X: {cut.xMm} mm, Y: {cut.yMm} mm</td>
                <td className="py-1 text-muted">{cut.rotated ? "✓ 90°" : "—"}</td>
                <td className="py-1 text-right text-foreground">
                  {((cut.widthMm * cut.lengthMm) / 1_000_000).toFixed(3)} m²
                </td>
              </tr>
            ))}
            <tr className="text-muted bg-[var(--surface-inset)]/50">
              <td className="py-1 font-semibold" colSpan={3}>
                🗑️ {t("cutting.scrapRemainder")}
              </td>
              <td className="py-1 text-right font-bold" colSpan={3}>
                {pattern.scrapAreaM2} m² ({((pattern.scrapAreaM2 / pattern.totalAreaM2) * 100).toFixed(1)}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProjectCutting({ project, compact }: ProjectCuttingProps) {
  const t = useTranslations("command");

  const cutGroups = useMemo(() => extractProjectCutGroups(project), [project]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("procurement");

  // 1D Bar Optimizer Parameters
  const [stockChoice, setStockChoice] = useState<number>(6000); // 6000, 12000, -1 (mixed), 0 (custom)
  const [customStockLength, setCustomStockLength] = useState<number>(6000);
  const [kerfMm, setKerfMm] = useState<number>(3);
  const [minOffcutMm, setMinOffcutMm] = useState<number>(500);

  // 2D Plate Optimizer Parameters
  const [selectedPlateFormatIndex, setSelectedPlateFormatIndex] = useState<number>(2); // Default: 1500x3000
  const [customPlateW, setCustomPlateW] = useState<number>(1500);
  const [customPlateL, setCustomPlateL] = useState<number>(3000);
  const [allowRotation, setAllowRotation] = useState<boolean>(true);
  const [edgeTrimMm, setEdgeTrimMm] = useState<number>(10);

  const [isPrintingCutSheet, setIsPrintingCutSheet] = useState<boolean>(false);

  const isProcurement = selectedGroupId === "procurement";

  const activeGroup = useMemo(() => {
    if (isProcurement) return null;
    return cutGroups.find((g) => g.groupId === selectedGroupId) ?? cutGroups[0] ?? null;
  }, [cutGroups, selectedGroupId, isProcurement]);

  const handlePrintCutSheet = () => {
    setIsPrintingCutSheet(true);
    requestAnimationFrame(() => {
      const done = () => {
        window.removeEventListener("afterprint", done);
        setIsPrintingCutSheet(false);
      };
      window.addEventListener("afterprint", done);
      window.print();
    });
  };

  // 1D Bar Optimization Result
  const barOptResult: CutOptimizationResult | null = useMemo(() => {
    if (!activeGroup || activeGroup.kind !== "1d_bar") return null;

    let stockLengthsMm: number[] = [6000, 12000];
    if (stockChoice === 6000) stockLengthsMm = [6000];
    else if (stockChoice === 12000) stockLengthsMm = [12000];
    else if (stockChoice === 0) stockLengthsMm = [customStockLength > 0 ? customStockLength : 6000];

    return optimizeCutList(activeGroup.pieces, {
      stockLengthsMm,
      kerfMm,
      minReusableRemnantMm: minOffcutMm,
    });
  }, [activeGroup, stockChoice, customStockLength, kerfMm, minOffcutMm]);

  // 2D Plate Optimization Result
  const plateOptResult: PlateOptimizationResult | null = useMemo(() => {
    if (!activeGroup || activeGroup.kind !== "2d_plate" || !activeGroup.platePieces) return null;

    let standardSheets: PlateSheetOption[] = STANDARD_EURO_SHEET_FORMATS;
    if (selectedPlateFormatIndex >= 0 && selectedPlateFormatIndex < STANDARD_EURO_SHEET_FORMATS.length) {
      standardSheets = [STANDARD_EURO_SHEET_FORMATS[selectedPlateFormatIndex]];
    } else if (selectedPlateFormatIndex === -1) {
      standardSheets = [
        {
          label: `${customPlateW} × ${customPlateL} mm (Custom)`,
          widthMm: customPlateW > 0 ? customPlateW : 1500,
          lengthMm: customPlateL > 0 ? customPlateL : 3000,
        },
      ];
    }

    return optimizePlateCutList(activeGroup.platePieces, {
      standardSheets,
      kerfMm,
      edgeTrimMm,
      allowRotation,
    });
  }, [activeGroup, selectedPlateFormatIndex, customPlateW, customPlateL, kerfMm, edgeTrimMm, allowRotation]);

  if (cutGroups.length === 0) {
    return (
      <EmptyState
        compact={compact}
        icon="info"
        title={t("cutting.emptyTitle")}
        body={t("cutting.emptyBody")}
      />
    );
  }

  const is2D = activeGroup?.kind === "2d_plate";

  return (
    <div className="space-y-3.5">
      {/* Print Document Portal */}
      {isPrintingCutSheet &&
        activeGroup &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fs-print">
            <ProjectCutSheetDoc
              group={activeGroup}
              barResult={barOptResult}
              plateResult={plateOptResult}
              projectName={project.name}
              kerfMm={kerfMm}
            />
          </div>,
          document.body,
        )}

      {/* Sleek Segmented Group Selector Rail */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[var(--border-faint)]">
        {/* Procurement Overview Tab */}
        <button
          type="button"
          onClick={() => setSelectedGroupId("procurement")}
          className="h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2"
          style={{
            background: isProcurement ? "var(--surface)" : "transparent",
            color: isProcurement ? "var(--accent-text)" : "var(--muted)",
            border: isProcurement ? "1px solid var(--accent)" : "1px solid transparent",
            boxShadow: isProcurement ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}
        >
          <span>📋 {t("cutting.procurementOverview")}</span>
          <span
            className="font-mono text-[10px] px-1.5 py-0.2 rounded-md"
            style={{
              background: isProcurement ? "var(--accent-surface)" : "var(--surface-inset)",
              color: isProcurement ? "var(--accent-text)" : "var(--muted)",
            }}
          >
            {cutGroups.length} sections
          </span>
        </button>

        {cutGroups.map((grp) => {
          const isSelected = !isProcurement && grp.groupId === (activeGroup?.groupId ?? "");
          return (
            <button
              key={grp.groupId}
              type="button"
              onClick={() => setSelectedGroupId(grp.groupId)}
              className="h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2"
              style={{
                background: isSelected ? "var(--surface)" : "transparent",
                color: isSelected ? "var(--accent-text)" : "var(--muted)",
                border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <span>{grp.label}</span>
              <span
                className="font-mono text-[10px] px-1.5 py-0.2 rounded-md"
                style={{
                  background: isSelected ? "var(--accent-surface)" : "var(--surface-inset)",
                  color: isSelected ? "var(--accent-text)" : "var(--muted)",
                }}
              >
                {grp.kind === "2d_plate" ? `${grp.totalAreaM2 ?? 0} m²` : `${grp.totalPieces} pcs`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Procurement Overview Screen */}
      {isProcurement ? (
        <ProjectProcurement project={project} compact={compact} />
      ) : (
        <div className="space-y-3.5">
          {/* Compact Inline Parameter Toolbar */}
          {!is2D ? (
            /* 1D Bar Toolbar */
            <div className="flex items-center justify-between gap-3 flex-wrap p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-faint)]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  {t("cutting.stockLength")}:
                </span>
                <div className="flex gap-1">
                  {STOCK_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setStockChoice(p.value)}
                      className="h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      style={{
                        background: stockChoice === p.value ? "var(--accent-surface)" : "var(--surface-inset)",
                        border: stockChoice === p.value ? "1px solid var(--accent-border)" : "1px solid var(--border-faint)",
                        color: stockChoice === p.value ? "var(--accent-text)" : "var(--foreground)",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStockChoice(0)}
                    className="h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      background: stockChoice === 0 ? "var(--accent-surface)" : "var(--surface-inset)",
                      border: stockChoice === 0 ? "1px solid var(--accent-border)" : "1px solid var(--border-faint)",
                      color: stockChoice === 0 ? "var(--accent-text)" : "var(--foreground)",
                    }}
                  >
                    {t("cutting.custom")}
                  </button>
                </div>
                {stockChoice === 0 && (
                  <input
                    type="number"
                    min={500}
                    max={24000}
                    step={100}
                    value={customStockLength}
                    onChange={(e) => setCustomStockLength(Number(e.target.value))}
                    className="h-7 w-20 px-2 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                    placeholder="mm"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-muted">{t("cutting.bladeKerf")}:</span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    step={0.5}
                    value={kerfMm}
                    onChange={(e) => setKerfMm(Number(e.target.value))}
                    className="h-7 w-14 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                  />
                  <span className="text-[10px] text-muted">mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-muted">{t("cutting.minOffcut")}:</span>
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    step={50}
                    value={minOffcutMm}
                    onChange={(e) => setMinOffcutMm(Number(e.target.value))}
                    className="h-7 w-16 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                  />
                  <span className="text-[10px] text-muted">mm</span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintCutSheet}
                  className="h-7 px-3 rounded-lg text-xs font-semibold border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-foreground flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <DeskIcon name="share" />
                  <span>{t("cutting.printSheet")}</span>
                </button>
              </div>
            </div>
          ) : (
            /* 2D Plate Toolbar */
            <div className="flex items-center justify-between gap-3 flex-wrap p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-faint)]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  {t("cutting.masterPlateFormat")}:
                </span>
                <div className="flex gap-1 flex-wrap">
                  {STANDARD_EURO_SHEET_FORMATS.map((fmt, idx) => (
                    <button
                      key={fmt.label}
                      type="button"
                      onClick={() => setSelectedPlateFormatIndex(idx)}
                      className="h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      style={{
                        background: selectedPlateFormatIndex === idx ? "var(--accent-surface)" : "var(--surface-inset)",
                        border: selectedPlateFormatIndex === idx ? "1px solid var(--accent-border)" : "1px solid var(--border-faint)",
                        color: selectedPlateFormatIndex === idx ? "var(--accent-text)" : "var(--foreground)",
                      }}
                    >
                      {fmt.widthMm} × {fmt.lengthMm}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedPlateFormatIndex(-1)}
                    className="h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      background: selectedPlateFormatIndex === -1 ? "var(--accent-surface)" : "var(--surface-inset)",
                      border: selectedPlateFormatIndex === -1 ? "1px solid var(--accent-border)" : "1px solid var(--border-faint)",
                      color: selectedPlateFormatIndex === -1 ? "var(--accent-text)" : "var(--foreground)",
                    }}
                  >
                    {t("cutting.custom")}
                  </button>
                </div>
                {selectedPlateFormatIndex === -1 && (
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="number"
                      min={200}
                      max={4000}
                      step={100}
                      value={customPlateW}
                      onChange={(e) => setCustomPlateW(Number(e.target.value))}
                      placeholder="W"
                      className="h-7 w-16 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                    />
                    <span className="text-muted text-xs">×</span>
                    <input
                      type="number"
                      min={200}
                      max={12000}
                      step={100}
                      value={customPlateL}
                      onChange={(e) => setCustomPlateL(Number(e.target.value))}
                      placeholder="L"
                      className="h-7 w-20 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-muted">{t("cutting.laserKerf")}:</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={kerfMm}
                    onChange={(e) => setKerfMm(Number(e.target.value))}
                    className="h-7 w-14 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                  />
                  <span className="text-[10px] text-muted">mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-muted">{t("cutting.edgeTrim")}:</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={edgeTrimMm}
                    onChange={(e) => setEdgeTrimMm(Number(e.target.value))}
                    className="h-7 w-14 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground"
                  />
                  <span className="text-[10px] text-muted">mm</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={allowRotation}
                    onChange={(e) => setAllowRotation(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>90° {t("cutting.allowRotation")}</span>
                </label>
                <button
                  type="button"
                  onClick={handlePrintCutSheet}
                  className="h-7 px-3 rounded-lg text-xs font-semibold border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-foreground flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <DeskIcon name="share" />
                  <span>{t("cutting.printSheet")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Unified Compact KPI Ribbon */}
          {!is2D && barOptResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatTile
                label={t("cutting.totalBars")}
                value={`${barOptResult.totalStockBars} bars`}
                sub={`${barOptResult.totalPiecesCount} cut pieces`}
                tone="accent"
              />
              <StatTile
                label={t("cutting.used")}
                value={`${(barOptResult.totalCutLengthMm / 1000).toFixed(2)} m`}
                sub={`of ${(barOptResult.totalStockLengthMm / 1000).toFixed(1)} m stock`}
              />
              <StatTile
                label={t("cutting.scrapLoss")}
                value={`${(barOptResult.totalScrapMm / 1000).toFixed(2)} m`}
                sub={`${barOptResult.scrapPercent}% drop`}
              />
              <StatTile
                label={t("cutting.yield")}
                value={`${barOptResult.yieldPercent}%`}
                sub={barOptResult.yieldPercent >= 85 ? "✨ High efficiency" : "Standard yield"}
                tone={barOptResult.yieldPercent >= 85 ? "green" : "muted"}
              />
            </div>
          )}

          {is2D && plateOptResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatTile
                label={t("cutting.totalMasterPlates")}
                value={`${plateOptResult.totalMasterSheets} plates`}
                sub={`${plateOptResult.totalPiecesCount} pieces`}
                tone="accent"
              />
              <StatTile
                label={t("cutting.usedArea")}
                value={`${plateOptResult.totalCutAreaM2} m²`}
                sub={`of ${plateOptResult.totalMasterAreaM2} m² raw`}
              />
              <StatTile
                label={t("cutting.scrapArea")}
                value={`${plateOptResult.totalScrapAreaM2} m²`}
                sub={`${plateOptResult.scrapPercent}% drop`}
              />
              <StatTile
                label={t("cutting.yield")}
                value={`${plateOptResult.yieldPercent}%`}
                sub={plateOptResult.yieldPercent >= 75 ? "✨ High efficiency" : "Standard nest"}
                tone={plateOptResult.yieldPercent >= 75 ? "green" : "muted"}
              />
            </div>
          )}

          {/* Oversized Rejection Warning */}
          {!is2D && barOptResult && barOptResult.uncuttablePieces.length > 0 && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "var(--red-strong, #ef4444)",
              }}
            >
              <strong>⚠️ {t("cutting.oversizedWarning")}:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {barOptResult.uncuttablePieces.map((p) => (
                  <li key={p.id}>
                    {p.label || p.id} ({p.lengthMm} mm × {p.quantity})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {is2D && plateOptResult && plateOptResult.uncuttablePieces.length > 0 && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "var(--red-strong, #ef4444)",
              }}
            >
              <strong>⚠️ {t("cutting.oversizedWarning")}:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {plateOptResult.uncuttablePieces.map((p) => (
                  <li key={p.id}>
                    {p.label || p.id} ({p.widthMm} × {p.lengthMm} mm)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule / Visual Layouts */}
          <div className="space-y-3 pt-1">
            {/* 1D Bar Patterns */}
            {!is2D && barOptResult && (
              <div className="space-y-3">
                {barOptResult.patterns.map((pattern, idx) => (
                  <BarSvgDiagram
                    key={pattern.barId}
                    pattern={pattern}
                    kerfMm={kerfMm}
                    barIndex={idx}
                  />
                ))}
              </div>
            )}

            {/* 2D Plate Patterns */}
            {is2D && plateOptResult && (
              <div className="space-y-3">
                {plateOptResult.patterns.map((pattern, idx) => (
                  <PlateSvgDiagram
                    key={pattern.sheetId}
                    pattern={pattern}
                    sheetIndex={idx}
                    edgeTrimMm={edgeTrimMm}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
