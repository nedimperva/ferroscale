"use client";

import { memo, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { ReferenceList } from "./reference-list";
import { triggerHaptic } from "@/lib/haptics";

function formatResultForClipboard(
  result: CalculationResult,
  profileLabel: string,
): string {
  const currency = CURRENCY_SYMBOLS[result.currency];
  const lines = [
    `${profileLabel}`,
    `Material: ${result.gradeLabel}`,
    `Unit weight: ${result.unitWeightKg} kg`,
    `Total weight: ${result.totalWeightKg} kg`,
    `Total cost: ${result.grandTotalAmount} ${currency}`,
  ];
  return lines.join("\n");
}

interface ResultPanelProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
}

export const ResultPanel = memo(function ResultPanel({
  result,
  isPending,
  onStar,
  isStarred,
  includeVat,
  wastePercent,
  vatPercent,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
}: ResultPanelProps) {
  const tBase = useTranslations();
  const t = useTranslations("result");

  const getGradeLabel = (label: string) => {
    if (label === "Custom density input") return tBase("dataset.customDensityInput");
    if (label === "Unknown") return tBase("dataset.unknown");
    return label;
  };

  // Animated values — hooks must be called before early return.
  const animatedTotal = useAnimatedNumber(result?.grandTotalAmount ?? 0);
  const animatedUnitWeight = useAnimatedNumber(result?.unitWeightKg ?? 0);
  const animatedTotalWeight = useAnimatedNumber(result?.totalWeightKg ?? 0);

  /** Format an animated float to the same decimal places as the reference number. */
  function fmtAnimated(animated: number, reference: number): string {
    const dot = String(reference).indexOf(".");
    const dec = dot === -1 ? 0 : String(reference).length - dot - 1;
    return animated.toFixed(dec);
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-muted-faint">{t("title")}</h2>
        <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-border">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
          </svg>
          <p className="text-sm text-muted-faint">
            {t("empty")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border bg-surface transition-opacity duration-200 ${isPending ? "border-border opacity-60" : "border-border"
        }`}
    >
      {/* ── Hero: Total Cost ── */}
      <div className="rounded-t-xl border-b border-accent-border bg-linear-to-b from-accent-surface to-surface px-5 py-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          {t("totalCost")}
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground tabular-nums transition-all duration-300">
          {fmtAnimated(animatedTotal, result.grandTotalAmount)}
        </p>
        <p className="mt-0.5 text-sm font-medium text-muted">{CURRENCY_SYMBOLS[result.currency]}</p>
      </div>

      {/* ── Weight cards ── */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-4">
        <div className="rounded-lg bg-surface-raised px-3 py-2.5">
          <p className="text-[11px] font-medium text-muted">{t("unitWeight")}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight transition-all duration-300">
            {fmtAnimated(animatedUnitWeight, result.unitWeightKg)}{" "}
            <span className="text-sm font-medium text-muted">kg</span>
          </p>
        </div>
        <div className="rounded-lg bg-surface-raised px-3 py-2.5">
          <p className="text-[11px] font-medium text-muted">{t("totalWeight")}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight transition-all duration-300">
            {fmtAnimated(animatedTotalWeight, result.totalWeightKg)}{" "}
            <span className="text-sm font-medium text-muted">kg</span>
          </p>
        </div>
      </div>

      {/* ── Detail rows ── */}
      <div className="mt-4 space-y-0 px-5 text-sm">
        <div className="flex items-baseline justify-between border-b border-border-faint py-2">
          <span className="text-muted">{t("profile")}</span>
          <span className="inline-flex max-w-[70%] items-center justify-end gap-1.5 text-right font-medium">
            {normalizedProfile && (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-inset text-muted">
                <ProfileIcon category={normalizedProfile.iconKey} className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="truncate">{normalizedProfile?.shortLabel ?? result.profileLabel}</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between border-b border-border-faint py-2">
          <span className="text-muted">{t("material")}</span>
          <span className="font-medium text-right">{getGradeLabel(result.gradeLabel)}</span>
        </div>
        <div className="flex items-baseline justify-between py-2">
          <span className="text-muted">{t("unitPrice")}</span>
          <span className="font-medium text-right">
            {result.unitPriceAmount} {CURRENCY_SYMBOLS[result.currency]}/{result.priceUnit ?? "kg"}
          </span>
        </div>
      </div>

      {/* ── Cost Breakdown (collapsible) ── */}
      <div className="mt-1 px-5">
        <details className="group rounded-lg border border-border-faint" onToggle={(e) => {
          if ((e.target as HTMLDetailsElement).open) {
            triggerHaptic("light");
          }
        }}>
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground-secondary select-none">
            {t("costBreakdown")}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted-faint transition-transform group-open:rotate-180">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="border-t border-border-faint px-3 py-2.5 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted">{t("subtotal")}</span>
              <span>{result.subtotalAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
            </div>
            {result.wasteAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-muted">
                  {t("waste", { percent: wastePercent })}
                </span>
                <span>{result.wasteAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
              </div>
            )}
            {includeVat && (
              <div className="flex justify-between py-1">
                <span className="text-muted">
                  {t("vat", { percent: vatPercent })}
                </span>
                <span>{result.vatAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
              <span>{t("total")}</span>
              <span className="text-accent">{result.grandTotalAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
            </div>
          </div>
        </details>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-col gap-2 px-5 pt-4 pb-5">
        {/* Compare — full width, primary action */}
        <button
          type="button"
          onClick={(e) => {
            triggerHaptic("light");
            onCompare?.();
          }}
          disabled={!canCompare && !isInCompare}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${isInCompare
            ? "border-blue-border bg-blue-surface text-blue-text"
            : canCompare
              ? "border-blue-border bg-blue-surface/70 text-blue-text hover:bg-blue-surface"
              : "cursor-not-allowed border-border-faint text-muted-faint"
            }`}
          title={
            isInCompare
              ? t("alreadyInCompare")
              : canCompare
                ? t("addToCompare")
                : t("compareFull", { max: maxCompare })
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
          {isInCompare
            ? t("inCompareCount", { count: compareCount, max: maxCompare })
            : t("addToCompare")}
        </button>

        {/* Save + Project + Copy — side by side */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={(e) => {
              triggerHaptic(isStarred ? "light" : "success");
              onStar();
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${isStarred
              ? "border-accent-border bg-accent-surface text-accent"
              : "border-border text-foreground-secondary hover:bg-surface-raised"
              }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${isStarred ? "fill-accent stroke-accent" : "fill-none stroke-current"
                }`}
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            {isStarred ? t("saved") : t("save")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              triggerHaptic("light");
              onAddToProject?.();
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${hasProjects
              ? "border-purple-border bg-purple-surface text-purple-text hover:bg-purple-surface"
              : "border-border text-foreground-secondary hover:bg-surface-raised"
              }`}
            title={t("addToProject")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
            </svg>
            {t("project")}
          </button>
          <CopyButton result={result} normalizedProfile={normalizedProfile} />
        </div>
      </div>

      {/* ── Full calculation steps (inline collapsible) ── */}
      <details className="border-t border-border-faint px-5 py-3" onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) {
          triggerHaptic("light");
        }
      }}>
        <summary className="cursor-pointer text-xs font-medium text-muted select-none">
          {t("fullSteps")}
        </summary>
        <div className="mt-2 overflow-x-auto">
          <p className="mb-2 text-xs text-muted">
            {t("formula")} {result.formulaLabel}
          </p>
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
                  <td className="py-1 pr-2">{row.labelKey ? tBase(row.labelKey) : row.label}</td>
                  <td className="py-1 pr-2 font-mono text-[11px]">{row.expression}</td>
                  <td className="py-1">{row.value} {row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* ── References ── */}
      <ReferenceList
        labels={result.referenceLabels}
        className="border-t border-border-faint px-5 py-3 text-xs text-muted-faint"
      />
    </section>
  );
});

function CopyButton({
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
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
        copied
          ? "border-green-border bg-green-surface text-green-text"
          : "border-border text-foreground-secondary hover:bg-surface-raised"
      }`}
      aria-label={t("copyAriaLabel")}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
