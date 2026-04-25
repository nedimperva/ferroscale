"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { roundTo } from "@/lib/calculator/units";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ReferenceList } from "./reference-list";
import { triggerHaptic } from "@/lib/haptics";
import {
  formatLocalizedNumber,
  formatSquareMeters,
  formatStaticNumber,
  getDecimalPlaces,
  getWorkspacePanelSpacing,
  PanelActionButton,
  PanelCompactMetric,
  PanelIconButton,
  PanelMetricCard,
  PanelSectionLabel,
} from "@/components/ui/result-style";
import { DATASET_VERSION } from "@/lib/datasets/version";

export type ResultLayoutMode = "standalone" | "column" | "sheet";

type QuickMetricTone = "price" | "weight" | "surface" | "neutral";

interface QuickMetric {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  tone: QuickMetricTone;
  muted?: boolean;
}

function formatAnimatedNumber(animated: number, reference: number): string {
  return animated.toFixed(getDecimalPlaces(reference));
}

function featuredMetricClass(tone: QuickMetricTone) {
  switch (tone) {
    case "price":
      return "border-accent-border bg-linear-to-br from-accent-surface to-surface";
    case "weight":
      return "border-blue-border bg-linear-to-br from-blue-surface to-surface";
    case "surface":
      return "border-green-border bg-linear-to-br from-green-surface to-surface";
    default:
      return "border-border bg-surface-raised";
  }
}

function supportingMetricClass(metric: QuickMetric) {
  if (metric.muted) {
    return "border-border-faint bg-surface-raised/75";
  }

  if (metric.tone === "surface") {
    return "border-green-border bg-linear-to-br from-green-surface to-surface";
  }

  return "border-border bg-surface-raised";
}

export function formatResultForClipboard(
  result: CalculationResult,
  profileLabel: string,
): string {
  const currency = CURRENCY_SYMBOLS[result.currency];
  const lines = [
    `${profileLabel}`,
    `Material: ${result.gradeLabel}`,
    `Unit weight: ${result.unitWeightKg} kg`,
    `Total weight: ${result.totalWeightKg} kg`,
    ...(result.surfaceAreaM2 != null ? [`Surface area: ${result.surfaceAreaM2} m²`] : []),
    `Total cost: ${result.grandTotalAmount} ${currency}`,
  ];
  return lines.join("\n");
}

export interface ResultContentProps {
  result: CalculationResult;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  isSaved: boolean;
  onOpenSaveDialog: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
  weightAsMain?: boolean;
  layout?: ResultLayoutMode;
}

export const ResultContent = memo(function ResultContent({
  result,
  includeVat,
  wastePercent,
  vatPercent,
  isSaved,
  onOpenSaveDialog,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
  weightAsMain = false,
  layout = "standalone",
}: ResultContentProps) {
  const locale = useLocale();
  const tBase = useTranslations();
  const t = useTranslations("result");

  const animatedTotal = useAnimatedNumber(result.grandTotalAmount);
  const animatedUnitWeight = useAnimatedNumber(result.unitWeightKg);
  const animatedTotalWeight = useAnimatedNumber(result.totalWeightKg);

  const profileLabel = normalizedProfile?.shortLabel ?? result.profileLabel;
  const gradeLabel = resolveGradeLabel(result.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[result.currency];
  const localizedUnitPrice = formatLocalizedNumber(result.unitPriceAmount, locale);
  const effectivePricePerKg = result.totalWeightKg > 0
    ? roundTo(result.subtotalAmount / result.totalWeightKg, 2)
    : 0;
  const localizedPricePerKg = formatLocalizedNumber(effectivePricePerKg, locale);
  const isMulti = result.quantity > 1;
  const spacingLayout = layout === "sheet" ? "mobile" : layout === "column" ? "column" : "drawer";
  const spacing = getWorkspacePanelSpacing(spacingLayout);
  const stickyTopBlock = layout === "column";
  const useCompactQuickMetrics = layout !== "standalone";

  const primaryValue = weightAsMain
    ? formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg)
    : formatAnimatedNumber(animatedTotal, result.grandTotalAmount);
  const primaryUnit = weightAsMain ? "kg" : currency;
  const secondaryValue = weightAsMain
    ? formatAnimatedNumber(animatedTotal, result.grandTotalAmount)
    : formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg);
  const secondaryUnit = weightAsMain ? currency : "kg";

  const sectionPadding = spacing.sectionPadding;
  const sectionGap = spacing.sectionGap;
  const isDesktopSummary = layout !== "sheet";
  const stackedSectionClass = layout === "sheet"
    ? "border-t border-border-faint/70 pt-4"
    : "border-t border-border-faint/70 pt-5";
  const primaryValueClass = isDesktopSummary
    ? "text-display text-foreground"
    : "text-display-mobile text-foreground";
  const primaryUnitClass = isDesktopSummary
    ? "pb-0.5 text-lg font-semibold text-accent"
    : "pb-1 text-xl font-semibold text-accent";

  const quickMetrics: Record<"totalWeight" | "unitPrice" | "unitWeight" | "surfaceArea", QuickMetric> = {
    totalWeight: {
      label: t("totalWeight"),
      value: formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg),
      unit: "kg",
      sublabel: isMulti ? t("pieces", { qty: result.quantity }) : undefined,
      tone: "weight",
    },
    unitPrice: {
      label: tBase("resultRows.unitPrice"),
      value: localizedUnitPrice,
      unit: currency,
      sublabel: `${localizedPricePerKg}${currency}/kg`,
      tone: "price",
    },
    unitWeight: {
      label: t("unitWeight"),
      value: formatAnimatedNumber(animatedUnitWeight, result.unitWeightKg),
      unit: "kg",
      sublabel: t("perPiece"),
      tone: "neutral",
    },
    surfaceArea: {
      label: t("surfaceArea"),
      value: result.surfaceAreaM2 != null ? formatStaticNumber(result.surfaceAreaM2) : "—",
      unit: result.surfaceAreaM2 != null ? "m²" : undefined,
      sublabel:
        result.surfaceAreaM2 == null
          ? t("surfaceUnavailable")
          : isMulti && result.unitSurfaceAreaM2 != null
            ? `${formatSquareMeters(result.unitSurfaceAreaM2)} / ${t("perPiece")}`
            : undefined,
      tone: "surface",
      muted: result.surfaceAreaM2 == null,
    },
  };

  const featuredQuickMetrics = weightAsMain
    ? [quickMetrics.totalWeight, quickMetrics.unitPrice]
    : [quickMetrics.unitPrice, quickMetrics.totalWeight];
  const supportingQuickMetrics = [quickMetrics.unitWeight, quickMetrics.surfaceArea];

  return (
    <div
      data-result-layout={layout}
      className={`flex flex-col ${layout === "column" ? "min-h-full" : ""}`}
    >
      <div
        data-result-top
        className={
          stickyTopBlock
            ? "sticky top-0 z-10 border-b border-border-faint bg-surface/92 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            : "border-b border-border-faint"
        }
      >
        <section
          data-result-summary
          className={`relative overflow-hidden ${sectionPadding} bg-linear-to-b from-surface-emphasis to-surface`}
        >
          {/* Engineering-grid texture — visible in dark mode only. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.055]"
            style={{
              backgroundImage:
                "linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative">
            {/* Top row: profile chip + label + compact icon actions */}
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/15">
                {normalizedProfile ? (
                  <ProfileIcon category={normalizedProfile.iconKey} className="h-4 w-4" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold text-foreground">{profileLabel}</p>
                <p className="truncate text-xs text-muted">
                  {gradeLabel}
                  {result.quantity > 1 ? ` · ${t("pieces", { qty: result.quantity })}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <PanelIconButton
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onCompare?.();
                  }}
                  disabled={!canCompare && !isInCompare}
                  className={
                    isInCompare
                      ? "border-blue-border bg-blue-surface text-blue-text"
                      : canCompare
                        ? "border-border bg-surface-raised text-foreground-secondary hover:border-blue-border hover:bg-blue-surface/75 hover:text-blue-text"
                        : "cursor-not-allowed border-border-faint bg-surface text-muted-faint"
                  }
                  title={
                    isInCompare
                      ? t("inCompareCount", { count: compareCount, max: maxCompare })
                      : canCompare
                        ? t("addToCompare")
                        : t("compareFull", { max: maxCompare })
                  }
                  aria-label={isInCompare ? t("alreadyInCompare") : t("addToCompare")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </svg>
                </PanelIconButton>

                <PanelIconButton
                  type="button"
                  onClick={() => {
                    triggerHaptic("success");
                    onOpenSaveDialog();
                  }}
                  className={
                    isSaved
                      ? "border-accent-border bg-accent text-white hover:bg-accent-hover"
                      : "border-accent-border bg-accent-surface text-accent hover:bg-accent-surface/80"
                  }
                  title={isSaved ? t("saved") : t("save")}
                  aria-label={isSaved ? t("saved") : t("save")}
                >
                  <motion.svg
                    key={isSaved ? "saved" : "unsaved"}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 ${isSaved ? "fill-current stroke-current" : "fill-none stroke-current"}`}
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </motion.svg>
                </PanelIconButton>

                <PanelIconButton
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onAddToProject?.();
                  }}
                  className={
                    hasProjects
                      ? "border-purple-border bg-purple-surface text-purple-text hover:bg-purple-surface"
                      : "border-border bg-surface-raised text-foreground-secondary hover:border-border-strong hover:bg-surface"
                  }
                  title={t("addToProject")}
                  aria-label={t("addToProject")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                  </svg>
                </PanelIconButton>

                <CopyIconButton result={result} normalizedProfile={normalizedProfile} />
              </div>
            </div>

            {/* Primary value — dominant, breathing room */}
            <div className="mt-4">
              <p className="text-eyebrow">
                {weightAsMain ? t("totalWeight") : t("totalPrice")}
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className={`select-text ${primaryValueClass}`}>{primaryValue}</p>
                <p className={primaryUnitClass}>{primaryUnit}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="select-text text-sm font-semibold tabular-nums text-foreground-secondary">
                  {secondaryValue}
                </span>
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  {secondaryUnit}
                </span>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span className="text-xs text-muted">
                  {localizedPricePerKg}
                  {currency}/kg {t("effective")}
                </span>
                {wastePercent > 0 && (
                  <span className="rounded-md border border-amber-border bg-amber-surface px-1.5 py-0.5 text-2xs font-semibold text-amber-text">
                    {t("contextWaste")} {wastePercent}%
                  </span>
                )}
                {includeVat && (
                  <span className="rounded-md border border-green-border bg-green-surface px-1.5 py-0.5 text-2xs font-semibold text-green-text">
                    {t("contextVat")} {vatPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={`${sectionPadding} ${sectionGap}`}>
        <section data-result-metrics>
          <PanelSectionLabel label={t("quickMetrics")} />

          <div className={`mt-3 grid gap-2.5 ${useCompactQuickMetrics ? "grid-cols-2" : "md:grid-cols-2"}`}>
            {featuredQuickMetrics.map((metric) => (
              useCompactQuickMetrics ? (
                <PanelCompactMetric
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                  sublabel={metric.sublabel}
                  className={featuredMetricClass(metric.tone)}
                  labelClassName="text-eyebrow"
                  valueClassName="text-base font-bold"
                  unitClassName={metric.tone === "price" ? "text-accent" : metric.tone === "weight" ? "text-blue-text" : ""}
                />
              ) : (
                <PanelMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                  sublabel={metric.sublabel}
                  className={featuredMetricClass(metric.tone)}
                />
              )
            ))}
          </div>

          <div className={`mt-2.5 grid gap-2 ${useCompactQuickMetrics ? "grid-cols-2" : "md:grid-cols-2"}`}>
            {supportingQuickMetrics.map((metric) => (
              <PanelCompactMetric
                key={metric.label}
                label={metric.label}
                value={metric.value}
                unit={metric.unit}
                sublabel={metric.sublabel}
                className={supportingMetricClass(metric)}
                labelClassName="text-eyebrow"
                valueClassName={metric.muted ? "text-muted" : "text-foreground"}
              />
            ))}
          </div>
        </section>

        <section data-result-cost className={stackedSectionClass}>
          <PanelSectionLabel label={t("costBreakdown")} />
          <div className="mt-3">
            <CostRow label={t("subtotal")} value={`${formatStaticNumber(result.subtotalAmount)} ${currency}`} />
            {result.wasteAmount > 0 && (
              <CostRow
                label={t("waste", { percent: wastePercent })}
                value={`${formatStaticNumber(result.wasteAmount)} ${currency}`}
              />
            )}
            {includeVat && (
              <CostRow
                label={t("vat", { percent: vatPercent })}
                value={`${formatStaticNumber(result.vatAmount)} ${currency}`}
              />
            )}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">{t("grandTotal")}</span>
              <span className="select-text text-lg font-bold text-accent tabular-nums">
                {formatAnimatedNumber(animatedTotal, result.grandTotalAmount)} {currency}
              </span>
            </div>
          </div>
        </section>

        <details
          data-result-details
          className={stackedSectionClass}
          onToggle={(event) => {
            if ((event.target as HTMLDetailsElement).open) {
              triggerHaptic("light");
            }
          }}
        >
          <summary className="cursor-pointer list-none py-0 text-sm font-semibold text-foreground transition-colors hover:text-foreground-secondary">
            <span className="flex items-center justify-between gap-3">
              <span>{t("calculationDetails")}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chevron-icon h-4 w-4 text-muted"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </summary>

          <div className="pt-3">
            <p className="mb-3 text-xs text-muted">
              {t("formula")} {result.formulaLabel}
            </p>

            {layout === "standalone" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-1">{t("step")}</th>
                      <th className="py-1">{t("expression")}</th>
                      <th className="py-1">{t("value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdownRows.map((row) => (
                      <tr key={`${row.label}-${row.expression}`}>
                        <td className="py-1 pr-2">
                          {row.labelKey ? tBase(row.labelKey) : row.label}
                        </td>
                        <td className="py-1 pr-2 font-mono text-xs">{row.expression}</td>
                        <td className="py-1">
                          {formatStaticNumber(row.value)} {row.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div data-result-breakdown-stack className="grid gap-2">
                {result.breakdownRows.map((row) => (
                  <div
                    key={`${row.label}-${row.expression}`}
                    className="border-t border-border-faint/70 px-0 py-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">
                          {row.labelKey ? tBase(row.labelKey) : row.label}
                        </p>
                        <p className="mt-1 break-words font-mono text-xs text-muted">
                          {row.expression}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs font-semibold text-foreground tabular-nums">
                        {formatStaticNumber(row.value)} {row.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <section className={stackedSectionClass}>
          <ReferenceList
            labels={result.referenceLabels}
            className="px-0 py-0 text-xs text-muted-faint"
          />
          <p className="mt-2 text-meta text-muted-faint">
            {t("datasetLine", { version: result.datasetVersion ?? DATASET_VERSION })}
          </p>
        </section>
      </div>
    </div>
  );
});

function CostRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="select-text text-sm font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function CopyIconButton({
  result,
  normalizedProfile,
}: {
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot | null;
}) {
  const t = useTranslations("result");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const label = normalizedProfile?.shortLabel ?? result.profileLabel;
    const text = formatResultForClipboard(result, label);
    navigator.clipboard.writeText(text).then(() => {
      triggerHaptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result, normalizedProfile]);

  return (
    <PanelIconButton
      type="button"
      onClick={handleCopy}
      className={
        copied
          ? "border-green-border bg-green-surface text-green-text"
          : "border-border bg-surface-raised text-foreground-secondary hover:border-border-strong hover:bg-surface"
      }
      title={copied ? t("copied") : t("copy")}
      aria-label={t("copyAriaLabel")}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </PanelIconButton>
  );
}

export function CopyButton({
  result,
  normalizedProfile,
  className = "",
}: {
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot | null;
  className?: string;
}) {
  const t = useTranslations("result");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const label = normalizedProfile?.shortLabel ?? result.profileLabel;
    const text = formatResultForClipboard(result, label);
    navigator.clipboard.writeText(text).then(() => {
      triggerHaptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result, normalizedProfile]);

  return (
    <PanelActionButton
      type="button"
      onClick={handleCopy}
      className={
        copied
          ? "border-green-border bg-green-surface text-green-text hover:bg-green-surface"
          : className
      }
      aria-label={t("copyAriaLabel")}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
      <span>{copied ? t("copied") : t("copy")}</span>
    </PanelActionButton>
  );
}
