"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { roundTo } from "@/lib/calculator/units";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ReferenceList } from "./reference-list";
import { triggerHaptic } from "@/lib/haptics";
import {
  formatLocalizedNumber,
  formatStaticNumber,
  getDecimalPlaces,
} from "@/components/ui/result-style";
import { DATASET_VERSION } from "@/lib/datasets/version";

export type ResultLayoutMode = "standalone" | "column" | "sheet";

function formatAnimatedNumber(animated: number, reference: number): string {
  return animated.toFixed(getDecimalPlaces(reference));
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

  const primaryValue = weightAsMain
    ? formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg)
    : formatAnimatedNumber(animatedTotal, result.grandTotalAmount);
  const primaryUnit = weightAsMain ? "kg" : currency;
  const secondaryValue = weightAsMain
    ? formatAnimatedNumber(animatedTotal, result.grandTotalAmount)
    : formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg);
  const secondaryUnit = weightAsMain ? currency : "kg";

  const sectionPadding = "px-4 py-4 md:px-5";
  const dividerClass = "border-t border-border-faint";

  const contextSegments = [
    t("pieces", { qty: result.quantity }),
    `${localizedPricePerKg}${currency}/kg`,
    ...(wastePercent > 0 ? [`${t("contextWaste")} ${wastePercent}%`] : []),
    ...(includeVat ? [`${t("contextVat")} ${vatPercent}%`] : []),
  ];

  const surfaceUnavailable = result.surfaceAreaM2 == null;
  const surfaceValue = surfaceUnavailable
    ? "—"
    : formatStaticNumber(result.surfaceAreaM2 as number);

  const quickMetrics: Array<{
    label: string;
    value: string;
    unit?: string;
    muted?: boolean;
  }> = [
    {
      label: tBase("resultRows.unitPrice"),
      value: localizedUnitPrice,
      unit: currency,
    },
    {
      label: t("unitWeight"),
      value: formatAnimatedNumber(animatedUnitWeight, result.unitWeightKg),
      unit: "kg",
    },
    {
      label: t("surfaceArea"),
      value: surfaceValue,
      unit: surfaceUnavailable ? undefined : "m²",
      muted: surfaceUnavailable,
    },
  ];

  return (
    <div
      data-result-layout={layout}
      className={`flex flex-col ${layout === "column" ? "min-h-full" : ""}`}
    >
      <section data-result-summary className={`${sectionPadding} ${layout === "sheet" ? "pr-12" : ""}`}>
        <p className="truncate text-xs text-muted">
          {profileLabel} · {gradeLabel}
        </p>

        <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          <p className="select-text text-[2.5rem] font-extrabold leading-none tracking-tight text-foreground tabular-nums md:text-[2.75rem]">
            {primaryValue}
          </p>
          <p className="pb-1 text-base font-semibold text-accent">{primaryUnit}</p>
        </div>

        <p className="mt-2 select-text text-sm font-medium text-foreground-secondary tabular-nums">
          {secondaryValue}
          <span className="ml-1 text-xs font-medium uppercase tracking-wide text-muted">
            {secondaryUnit}
          </span>
        </p>

        {contextSegments.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {contextSegments.join(" · ")}
          </p>
        )}
      </section>

      <section data-result-metrics className={`${dividerClass} ${sectionPadding}`}>
        <div className="grid grid-cols-1 gap-y-2.5 md:grid-cols-2 md:gap-x-6">
          {quickMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-faint">
                {metric.label}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  metric.muted ? "text-muted" : "text-foreground"
                }`}
              >
                {metric.value}
                {metric.unit && (
                  <span className="ml-1 text-xs font-medium text-muted">{metric.unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section data-result-cost className={`${dividerClass} ${sectionPadding}`}>
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
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border-faint pt-3">
          <span className="text-sm font-semibold text-foreground">{t("grandTotal")}</span>
          <span className="select-text text-xl font-bold tabular-nums text-accent">
            {formatAnimatedNumber(animatedTotal, result.grandTotalAmount)} {currency}
          </span>
        </div>
      </section>

      <section data-result-actions className={`${dividerClass} ${sectionPadding}`}>
        <div className="grid grid-cols-2 gap-2">
          <GhostActionButton
            onClick={() => {
              triggerHaptic("light");
              onCompare?.();
            }}
            disabled={!canCompare && !isInCompare}
            active={isInCompare}
            title={
              isInCompare
                ? t("alreadyInCompare")
                : canCompare
                  ? t("addToCompare")
                  : t("compareFull", { max: maxCompare })
            }
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
            }
            label={
              isInCompare
                ? t("inCompareCount", { count: compareCount, max: maxCompare })
                : t("addToCompare")
            }
          />

          <GhostActionButton
            onClick={() => {
              triggerHaptic("success");
              onOpenSaveDialog();
            }}
            active={isSaved}
            icon={
              <motion.svg
                key={isSaved ? "saved" : "unsaved"}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`h-4 w-4 shrink-0 ${isSaved ? "fill-current" : "fill-none"}`}
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </motion.svg>
            }
            label={isSaved ? t("saved") : t("save")}
          />

          <GhostActionButton
            onClick={() => {
              triggerHaptic("light");
              onAddToProject?.();
            }}
            active={hasProjects}
            title={t("addToProject")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
              </svg>
            }
            label={t("project")}
          />

          <CopyButton result={result} normalizedProfile={normalizedProfile} />
        </div>
      </section>

      <details
        data-result-details
        className={`${dividerClass} ${sectionPadding} group`}
        onToggle={(event) => {
          if ((event.target as HTMLDetailsElement).open) {
            triggerHaptic("light");
          }
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-muted transition-colors hover:text-foreground">
          <span>{t("calculationDetails")}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-muted-faint transition-transform group-open:rotate-180"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div className="pt-3">
          <p className="mb-3 text-[11px] text-muted-faint">
            {t("formula")} {result.formulaLabel}
          </p>

          <div className="grid gap-2">
            {result.breakdownRows.map((row) => (
              <div
                key={`${row.label}-${row.expression}`}
                className="border-t border-border-faint/70 pt-2 first:border-t-0 first:pt-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground-secondary">
                      {row.labelKey ? tBase(row.labelKey) : row.label}
                    </p>
                    <p className="mt-0.5 break-words font-mono text-[11px] text-muted">
                      {row.expression}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                    {formatStaticNumber(row.value)} {row.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>

      <section className={`${dividerClass} ${sectionPadding}`}>
        <ReferenceList
          labels={result.referenceLabels}
          className="px-0 py-0 text-[11px] text-muted-faint"
        />
        <p className="mt-2 text-[11px] text-muted-faint">
          {t("datasetLine", { version: result.datasetVersion ?? DATASET_VERSION })}
        </p>
      </section>
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
      <span className="select-text text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

interface GhostActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  icon: React.ReactNode;
  label: string;
}

function GhostActionButton({
  onClick,
  disabled,
  active,
  title,
  icon,
  label,
}: GhostActionButtonProps) {
  const stateClass = disabled
    ? "cursor-not-allowed border-border-faint bg-surface text-muted-faint"
    : active
      ? "border-border-faint bg-surface text-accent hover:bg-surface-raised"
      : "border-border-faint bg-surface text-foreground-secondary hover:bg-surface-raised hover:text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${stateClass}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function CopyButton({
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
    <GhostActionButton
      onClick={handleCopy}
      active={copied}
      title={t("copyAriaLabel")}
      icon={
        copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )
      }
      label={copied ? t("copied") : t("copy")}
    />
  );
}
