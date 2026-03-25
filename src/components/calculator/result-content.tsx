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
  PanelActionButton,
  PanelMetricCard,
  PanelSectionLabel,
  PanelSummaryChip,
} from "@/components/ui/result-style";

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
    ...(result.surfaceAreaM2 != null ? [`Surface area: ${result.surfaceAreaM2} m\u00b2`] : []),
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
  const usesCompactSpacing = layout !== "standalone";
  const stickyTopBlock = layout === "column";

  const primaryValue = weightAsMain
    ? formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg)
    : formatAnimatedNumber(animatedTotal, result.grandTotalAmount);
  const primaryUnit = weightAsMain ? "kg" : currency;
  const secondaryValue = weightAsMain
    ? formatAnimatedNumber(animatedTotal, result.grandTotalAmount)
    : formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg);
  const secondaryUnit = weightAsMain ? currency : "kg";

  const sectionPadding = usesCompactSpacing ? "px-4 py-4" : "px-5 py-5";
  const sectionGap = usesCompactSpacing ? "space-y-4" : "space-y-5";

  const summaryChips = [
    { label: t("contextQuantity"), value: t("pieces", { qty: result.quantity }) },
    { label: t("contextPricing"), value: `${localizedPricePerKg}${currency}/kg` },
    ...(wastePercent > 0 ? [{ label: t("contextWaste"), value: `${wastePercent}%` }] : []),
    ...(includeVat ? [{ label: t("contextVat"), value: `${vatPercent}%` }] : []),
  ];

  return (
    <div
      data-result-layout={layout}
      className={`flex flex-col ${layout === "column" ? "min-h-full" : ""}`}
    >
      <div
        data-result-top
        className={
          stickyTopBlock
            ? "sticky top-0 z-10 border-b border-border bg-surface/95 shadow-sm backdrop-blur"
            : "border-b border-border-faint"
        }
      >
        <section
          data-result-summary
          className={`${sectionPadding} bg-linear-to-b from-accent-surface/80 to-surface`}
        >
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent ring-1 ring-accent/20">
              {normalizedProfile ? (
                <ProfileIcon category={normalizedProfile.iconKey} className="h-5 w-5" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <p className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {primaryValue}
                </p>
                <p className="pb-1 text-lg font-semibold text-accent">{primaryUnit}</p>
              </div>

              <p className="mt-1 text-sm font-medium text-foreground-secondary tabular-nums">
                {secondaryValue}
                <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {secondaryUnit}
                </span>
              </p>

              <p className="mt-2 truncate text-sm text-muted">
                {profileLabel} · {gradeLabel}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {summaryChips.map((chip) => (
              <PanelSummaryChip key={`${chip.label}-${chip.value}`} label={chip.label} value={chip.value} />
            ))}
          </div>
        </section>

        <section data-result-actions className={`${sectionPadding} pt-0`}>
          <div className="grid grid-cols-2 gap-2">
            <PanelActionButton
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
                    ? "border-blue-border bg-blue-surface/70 text-blue-text hover:bg-blue-surface"
                    : "cursor-not-allowed border-border-faint bg-surface text-muted-faint"
              }
              title={
                isInCompare
                  ? t("alreadyInCompare")
                  : canCompare
                    ? t("addToCompare")
                    : t("compareFull", { max: maxCompare })
              }
            >
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
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
              <span>
                {isInCompare
                  ? t("inCompareCount", { count: compareCount, max: maxCompare })
                  : t("addToCompare")}
              </span>
            </PanelActionButton>

            <PanelActionButton
              type="button"
              onClick={() => {
                triggerHaptic("success");
                onOpenSaveDialog();
              }}
              className={
                isSaved
                  ? "border-accent-border bg-accent text-white hover:bg-accent"
                  : "border-accent-border bg-accent-surface text-accent hover:bg-accent-surface/80"
              }
            >
              <motion.svg
                key={isSaved ? "saved" : "unsaved"}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${isSaved ? "fill-current stroke-current" : "fill-none stroke-current"}`}
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </motion.svg>
              <span>{isSaved ? t("saved") : t("save")}</span>
            </PanelActionButton>

            <PanelActionButton
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onAddToProject?.();
              }}
              className={
                hasProjects
                  ? "border-purple-border bg-purple-surface text-purple-text hover:bg-purple-surface"
                  : "border-border bg-surface text-foreground-secondary hover:bg-surface-raised"
              }
              title={t("addToProject")}
            >
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
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
              </svg>
              <span>{t("project")}</span>
            </PanelActionButton>

            <CopyButton
              result={result}
              normalizedProfile={normalizedProfile}
              className="border-border bg-surface text-foreground-secondary hover:bg-surface-raised"
            />
          </div>
        </section>
      </div>

      <div className={`${sectionPadding} ${sectionGap}`}>
        <section data-result-metrics>
          <PanelSectionLabel label={t("quickMetrics")} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PanelMetricCard
              label={t("unitWeight")}
              value={formatAnimatedNumber(animatedUnitWeight, result.unitWeightKg)}
              unit="kg"
            />
            <PanelMetricCard
              label={t("totalWeight")}
              value={formatAnimatedNumber(animatedTotalWeight, result.totalWeightKg)}
              unit="kg"
              sublabel={isMulti ? t("pieces", { qty: result.quantity }) : undefined}
            />
            <PanelMetricCard
              label={t("unitPrice")}
              value={localizedUnitPrice}
              unit={currency}
            />
            <PanelMetricCard
              label={t("surfaceArea")}
              value={result.surfaceAreaM2 != null ? formatStaticNumber(result.surfaceAreaM2) : "—"}
              unit={result.surfaceAreaM2 != null ? "m\u00b2" : undefined}
              sublabel={
                result.surfaceAreaM2 == null
                  ? t("surfaceUnavailable")
                  : isMulti && result.unitSurfaceAreaM2 != null
                    ? `${formatSquareMeters(result.unitSurfaceAreaM2)} · ${t("perPiece")}`
                    : undefined
              }
            />
          </div>
        </section>

        <section data-result-cost>
          <PanelSectionLabel label={t("costBreakdown")} />
          <div className="mt-3 rounded-2xl border border-border bg-surface-raised p-3">
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
            <div className="mt-3 rounded-xl border border-accent-border bg-accent-surface px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{t("grandTotal")}</span>
                <span className="text-xl font-bold text-accent tabular-nums">
                  {formatAnimatedNumber(animatedTotal, result.grandTotalAmount)} {currency}
                </span>
              </div>
            </div>
          </div>
        </section>

        <details
          data-result-details
          className="rounded-2xl border border-border bg-surface-raised"
          onToggle={(event) => {
            if ((event.target as HTMLDetailsElement).open) {
              triggerHaptic("light");
            }
          }}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
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
                className="h-4 w-4 text-muted"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </summary>

          <div className="border-t border-border-faint px-4 py-4">
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
                    className="rounded-xl border border-border bg-surface px-3 py-3"
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

        <section>
          <ReferenceList
            labels={result.referenceLabels}
            className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-xs text-muted-faint"
          />
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
      <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
    </div>
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
