"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import {
  computeProjectProcurementSummary,
  generateSupplierRfqText,
  type ProjectProcurementSummary,
} from "@/lib/projects/cutting";
import { DeskIcon } from "../desktop/desk-atoms";
import { ProjectProcurementDoc } from "./project-print-docs";

interface ProjectProcurementProps {
  project: Project;
  compact?: boolean;
}

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
                ? "var(--green-text)"
                : "var(--foreground)",
        }}
      >
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

export function ProjectProcurement({ project }: ProjectProcurementProps) {
  const t = useTranslations("command");
  const [copied, setCopied] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const summary: ProjectProcurementSummary = useMemo(() => {
    return computeProjectProcurementSummary(project);
  }, [project]);

  const handleCopyRfq = async () => {
    try {
      const text = generateSupplierRfqText(summary, project.name);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard fallback
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    requestAnimationFrame(() => {
      const done = () => {
        window.removeEventListener("afterprint", done);
        setIsPrinting(false);
      };
      window.addEventListener("afterprint", done);
      window.print();
    });
  };

  return (
    <div className="space-y-4">
      {/* Print Document Portal */}
      {isPrinting &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fs-print">
            <ProjectProcurementDoc summary={summary} projectName={project.name} />
          </div>,
          document.body,
        )}

      {/* Top KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile
          label={t("cutting.rawWeight")}
          value={`${summary.totalRawWeightKg.toLocaleString()} kg`}
          sub={
            summary.totalRawWeightKg >= 1000
              ? `${(summary.totalRawWeightKg / 1000).toFixed(2)} tonnes total`
              : "Raw steel to buy"
          }
          tone="accent"
        />
        <StatTile
          label={t("cutting.netWeight")}
          value={`${summary.totalNetWeightKg.toLocaleString()} kg`}
          sub={`Finished parts weight`}
        />
        <StatTile
          label={t("cutting.scrapLoss")}
          value={`${summary.totalScrapWeightKg.toLocaleString()} kg`}
          sub={`${summary.globalScrapPercent}% drop loss`}
        />
        <StatTile
          label={t("cutting.globalYield")}
          value={`${summary.globalYieldPercent}%`}
          sub={summary.globalYieldPercent >= 85 ? "✨ High efficiency" : "Overall yield"}
          tone={summary.globalYieldPercent >= 85 ? "green" : "muted"}
        />
      </div>

      {/* Material Order Table Card */}
      <div
        className="rounded-[18px] p-4 space-y-3.5"
        style={{
          border: "1px solid var(--border-faint)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-foreground">
              {t("cutting.orderOverviewTitle")}
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              {t("cutting.orderOverviewDesc", {
                bars: summary.totalBarsCount,
                sheets: summary.totalSheetsCount,
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRfq}
              className="h-8 px-3 rounded-xl text-xs font-semibold border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-foreground flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? (
                <span className="text-emerald-500 font-bold">✓ {t("cutting.rfqCopied")}</span>
              ) : (
                <>
                  <DeskIcon name="copy" />
                  <span>{t("cutting.copyRfq")}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 rounded-xl text-xs font-semibold border border-[var(--border-faint)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-foreground flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <DeskIcon name="share" />
              <span>{t("cutting.printOrder")}</span>
            </button>
          </div>
        </div>

        {/* Mobile Procurement Cards View (< md) */}
        <div className="md:hidden space-y-2.5">
          {summary.items.map((item, idx) => (
            <div
              key={`procure-card-${idx}`}
              className="p-3 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-raised)] space-y-2 font-mono"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                  <span>{item.kind === "2d_plate" ? "📐" : "📏"}</span>
                  <span className="truncate">{item.label}</span>
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-bold flex-shrink-0"
                  style={{
                    background:
                      item.yieldPercent >= 80
                        ? "var(--green-surface, rgba(16,185,129,0.12))"
                        : "var(--surface-inset)",
                    color:
                      item.yieldPercent >= 80
                        ? "var(--green-text)"
                        : "var(--foreground-secondary)",
                  }}
                >
                  {item.yieldPercent}% {t("cutting.yield")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs bg-[var(--surface-inset)] p-2 rounded-lg border border-[var(--border-faint)]">
                <span className="text-muted text-[11px]">{t("cutting.stockToOrder")}:</span>
                <span className="font-bold text-[var(--accent-text)]">
                  {item.rawStockUnits} <span className="text-muted font-normal text-[10.5px]">({item.stockDescription})</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-0.5">
                <div className="bg-[var(--surface)] p-1.5 rounded-lg border border-[var(--border-faint)]">
                  <div className="text-muted-faint text-[9.5px] uppercase">{t("cutting.rawWeight")}</div>
                  <div className="font-bold text-foreground mt-0.5">{item.rawWeightKg.toLocaleString()} kg</div>
                </div>
                <div className="bg-[var(--surface)] p-1.5 rounded-lg border border-[var(--border-faint)]">
                  <div className="text-muted-faint text-[9.5px] uppercase">{t("cutting.netWeight")}</div>
                  <div className="font-semibold text-foreground mt-0.5">{item.netWeightKg.toLocaleString()} kg</div>
                </div>
                <div className="bg-[var(--surface)] p-1.5 rounded-lg border border-[var(--border-faint)]">
                  <div className="text-muted-faint text-[9.5px] uppercase">{t("cutting.scrap")}</div>
                  <div className="text-muted mt-0.5">{item.scrapWeightKg.toLocaleString()} kg</div>
                </div>
              </div>
            </div>
          ))}

          {/* Mobile Totals Card */}
          <div className="p-3 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-inset)] space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground">{t("cutting.totalProcurement")}</span>
              <span className="font-bold text-xs" style={{ color: "var(--accent-text)" }}>
                {summary.totalRawWeightKg.toLocaleString()} kg
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>{summary.totalBarsCount} bars · {summary.totalSheetsCount} master plates</span>
              <span className="text-[var(--green-text)] font-bold">{summary.globalYieldPercent}% yield</span>
            </div>
          </div>
        </div>

        {/* Desktop Itemized Material Order Table (hidden on mobile, visible >= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px] font-mono border-collapse">
            <thead>
              <tr className="text-muted text-[10.5px] uppercase border-b border-[var(--border-faint)] text-left">
                <th className="pb-2 font-semibold">{t("cutting.sectionMaterial")}</th>
                <th className="pb-2 font-semibold">{t("cutting.stockToOrder")}</th>
                <th className="pb-2 font-semibold text-right">{t("cutting.rawWeight")}</th>
                <th className="pb-2 font-semibold text-right">{t("cutting.netWeight")}</th>
                <th className="pb-2 font-semibold text-right">{t("cutting.scrap")}</th>
                <th className="pb-2 font-semibold text-right">{t("cutting.yield")}</th>
              </tr>
            </thead>
            <tbody>
              {summary.items.map((item, idx) => (
                <tr
                  key={`procure-${idx}`}
                  className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-inset)] transition-colors"
                >
                  <td className="py-2.5 text-foreground font-medium">
                    <span className="mr-1.5 opacity-80">
                      {item.kind === "2d_plate" ? "📐" : "📏"}
                    </span>
                    <strong>{item.label}</strong>
                  </td>
                  <td className="py-2.5 text-foreground">
                    <span className="font-bold text-[var(--accent-text)] bg-[var(--surface-inset)] px-2 py-0.5 rounded-md border border-[var(--border-faint)]">
                      {item.rawStockUnits}
                    </span>
                    <span className="text-muted text-[11px] ml-2">
                      ({item.stockDescription})
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-foreground">
                    {item.rawWeightKg.toLocaleString()} kg
                  </td>
                  <td className="py-2.5 text-right text-muted">
                    {item.netWeightKg.toLocaleString()} kg
                  </td>
                  <td className="py-2.5 text-right text-muted">
                    {item.scrapWeightKg.toLocaleString()} kg
                  </td>
                  <td className="py-2.5 text-right font-bold">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px]"
                      style={{
                        background:
                          item.yieldPercent >= 80
                            ? "var(--green-surface, rgba(16,185,129,0.12))"
                            : "var(--surface-inset)",
                        color:
                          item.yieldPercent >= 80
                            ? "var(--green-text)"
                            : "var(--foreground-secondary)",
                      }}
                    >
                      {item.yieldPercent}%
                    </span>
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="border-t-2 border-[var(--border-faint)] bg-[var(--surface-inset)]/60 font-bold">
                <td className="py-2.5 text-foreground">
                  {t("cutting.totalProcurement")}
                </td>
                <td className="py-2.5 text-muted">
                  {summary.totalBarsCount} bars · {summary.totalSheetsCount} master plates
                </td>
                <td className="py-2.5 text-right text-[var(--accent-text)]">
                  {summary.totalRawWeightKg.toLocaleString()} kg
                </td>
                <td className="py-2.5 text-right text-foreground">
                  {summary.totalNetWeightKg.toLocaleString()} kg
                </td>
                <td className="py-2.5 text-right text-muted">
                  {summary.totalScrapWeightKg.toLocaleString()} kg
                </td>
                <td className="py-2.5 text-right text-[var(--green-text)]">
                  {summary.globalYieldPercent}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
