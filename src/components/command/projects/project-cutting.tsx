"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { optimizeCutList, type CutOptimizationResult, type CutPattern } from "@ferroscale/metal-core";
import type { Project } from "@/hooks/useProjects";
import { extractProjectCutGroups, type ProjectCutGroup } from "@/lib/projects/cutting";
import { DeskIcon } from "../desktop/desk-atoms";
import { EmptyState } from "../empty-state";

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
  { fill: "color-mix(in srgb, var(--accent) 22%, var(--surface))", stroke: "var(--accent)", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #3b82f6 20%, var(--surface))", stroke: "#3b82f6", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #10b981 20%, var(--surface))", stroke: "#10b981", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #f59e0b 22%, var(--surface))", stroke: "#f59e0b", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #8b5cf6 20%, var(--surface))", stroke: "#8b5cf6", text: "var(--foreground)" },
  { fill: "color-mix(in srgb, #ec4899 20%, var(--surface))", stroke: "#ec4899", text: "var(--foreground)" },
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
      className="rounded-[15px] min-w-0"
      style={{
        padding: "11px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase truncate">
        {label}
      </div>
      <div
        className="font-mono font-bold mt-1 truncate"
        style={{
          fontSize: 17,
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
      {sub && <div className="text-[11px] text-muted mt-0.5 truncate">{sub}</div>}
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
  const vbH = 44;

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
            {(pattern.stockLengthMm / 1000).toFixed(1)} m · {t("cutting.cutsCount", { count: pattern.cuts.length })}
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
          style={{ height: "42px" }}
          preserveAspectRatio="none"
        >
          {pattern.cuts.map((cut, cIdx) => {
            const color = CUT_PALETTE[cIdx % CUT_PALETTE.length];
            const x = scale(cut.startMm);
            const w = Math.max(1, scale(cut.lengthMm));
            const isWideEnough = w >= 60;

            return (
              <g key={`cut-${cIdx}`}>
                {/* Cut Block */}
                <rect
                  x={x}
                  y={0}
                  width={w}
                  height={vbH}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={1}
                />
                {/* Cut Label */}
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
                    {cut.lengthMm} mm
                  </text>
                )}
                {/* Saw Kerf Indicator */}
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

          {/* Remnant / Scrap Block */}
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
                  fontSize="10.5"
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

export function ProjectCutting({ project, compact }: ProjectCuttingProps) {
  const t = useTranslations("command");
  const cutGroups = useMemo(() => extractProjectCutGroups(project), [project]);

  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [stockPreset, setStockPreset] = useState<number>(6000);
  const [customStockMm, setCustomStockMm] = useState<number>(6000);
  const [kerfMm, setKerfMm] = useState<number>(3);
  const [minReusableMm, setMinReusableMm] = useState<number>(500);

  const selectedGroup = cutGroups[selectedGroupIdx] ?? cutGroups[0];

  const stockLengthsToUse = useMemo(() => {
    if (stockPreset === -1) return [6000, 12000];
    if (stockPreset === 0) return [customStockMm > 0 ? customStockMm : 6000];
    return [stockPreset];
  }, [stockPreset, customStockMm]);

  const optimizationResult: CutOptimizationResult | null = useMemo(() => {
    if (!selectedGroup || selectedGroup.pieces.length === 0) return null;
    return optimizeCutList(selectedGroup.pieces, {
      stockLengthsMm: stockLengthsToUse,
      kerfMm,
      minReusableRemnantMm: minReusableMm,
    });
  }, [selectedGroup, stockLengthsToUse, kerfMm, minReusableMm]);

  if (cutGroups.length === 0) {
    return (
      <EmptyState
        title={t("cutting.emptyTitle")}
        body={t("cutting.emptyBody")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Group Selector Pill Rail */}
      {cutGroups.length > 1 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-muted uppercase fs-track-label">
            {t("cutting.selectProfileGroup")}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cutGroups.map((group, idx) => {
              const active = idx === selectedGroupIdx;
              return (
                <button
                  key={group.groupId}
                  type="button"
                  onClick={() => setSelectedGroupIdx(idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                  style={{
                    background: active ? "var(--accent-surface)" : "var(--surface)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border-faint)"}`,
                    color: active ? "var(--accent-text)" : "var(--foreground)",
                  }}
                >
                  <span>{group.label}</span>
                  <span className="font-mono text-[11px] opacity-75">
                    ({group.totalPieces} pcs · {(group.totalLengthMm / 1000).toFixed(1)}m)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cutting Settings Bar */}
      <div
        className="rounded-[16px] p-3.5 space-y-3"
        style={{
          border: "1px solid var(--border-faint)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Stock bar length options */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted font-medium">{t("cutting.stockLength")}:</span>
            {STOCK_PRESETS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setStockPreset(opt.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors"
                style={{
                  background: stockPreset === opt.value ? "var(--accent)" : "var(--surface-inset)",
                  color: stockPreset === opt.value ? "#ffffff" : "var(--foreground)",
                  border: "1px solid var(--border-faint)",
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStockPreset(0)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors"
              style={{
                background: stockPreset === 0 ? "var(--accent)" : "var(--surface-inset)",
                color: stockPreset === 0 ? "#ffffff" : "var(--foreground)",
                border: "1px solid var(--border-faint)",
              }}
            >
              {t("cutting.custom")}
            </button>
            {stockPreset === 0 && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={500}
                  max={24000}
                  step={100}
                  value={customStockMm}
                  onChange={(e) => setCustomStockMm(Math.max(500, Number(e.target.value) || 6000))}
                  className="w-20 px-2 py-1 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] text-foreground"
                />
                <span className="text-[11px] text-muted font-mono">mm</span>
              </div>
            )}
          </div>

          {/* Saw Kerf & Remnant Inputs */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <label className="flex items-center gap-1.5">
              <span className="text-muted">{t("cutting.bladeKerf")}:</span>
              <input
                type="number"
                min={0}
                max={15}
                step={0.5}
                value={kerfMm}
                onChange={(e) => setKerfMm(Math.max(0, Number(e.target.value) || 0))}
                className="w-14 px-1.5 py-0.5 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface-inset)] text-foreground"
              />
              <span className="text-muted font-mono">mm</span>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-muted">{t("cutting.minOffcut")}:</span>
              <input
                type="number"
                min={0}
                max={5000}
                step={100}
                value={minReusableMm}
                onChange={(e) => setMinReusableMm(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 px-1.5 py-0.5 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface-inset)] text-foreground"
              />
              <span className="text-muted font-mono">mm</span>
            </label>
          </div>
        </div>
      </div>

      {/* Summary Stat Tiles */}
      {optimizationResult && (
        <div className={`grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          <StatTile
            label={t("cutting.totalBars")}
            value={`${optimizationResult.totalStockBars} × ${(optimizationResult.totalStockLengthMm / optimizationResult.totalStockBars / 1000).toFixed(1)}m`}
            sub={`${(optimizationResult.totalStockLengthMm / 1000).toFixed(1)} m total`}
            tone="accent"
          />
          <StatTile
            label={t("cutting.yield")}
            value={`${optimizationResult.yieldPercent}%`}
            sub={`${(optimizationResult.totalCutLengthMm / 1000).toFixed(1)} m useful`}
            tone="green"
          />
          <StatTile
            label={t("cutting.reusableOffcut")}
            value={`${(optimizationResult.totalReusableMm / 1000).toFixed(1)} m`}
            sub={`${optimizationResult.patterns.filter((p) => p.isReusable).length} pieces`}
          />
          <StatTile
            label={t("cutting.scrapLoss")}
            value={`${(optimizationResult.totalScrapMm / 1000).toFixed(2)} m`}
            sub={`${optimizationResult.scrapPercent}% (${optimizationResult.totalKerfLossMm}mm kerf)`}
            tone="muted"
          />
        </div>
      )}

      {/* Warnings / Oversized items */}
      {optimizationResult && optimizationResult.uncuttablePieces.length > 0 && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--red-strong, #ef4444)",
          }}
        >
          <strong>{t("cutting.oversizedWarning")}:</strong>{" "}
          {optimizationResult.uncuttablePieces.map((p) => `${p.label ?? p.id} (${p.lengthMm} mm)`).join(", ")}
        </div>
      )}

      {/* Bar-by-bar Cut Plans */}
      {optimizationResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-muted uppercase fs-track-label">
              {t("cutting.cuttingPlan", { profile: selectedGroup.label })}
            </h3>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-[var(--surface-inset)] border border-[var(--border-faint)] hover:bg-[var(--surface)] text-foreground"
            >
              <DeskIcon name="print" />
              <span>{t("cutting.printSheet")}</span>
            </button>
          </div>

          <div className="space-y-3">
            {optimizationResult.patterns.map((pattern, idx) => (
              <BarSvgDiagram
                key={pattern.barId}
                pattern={pattern}
                kerfMm={kerfMm}
                barIndex={idx}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
