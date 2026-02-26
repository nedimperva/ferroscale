"use client";

import { memo } from "react";
import { Drawer } from "vaul";
import { useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ReferenceList } from "./reference-list";
import { triggerHaptic } from "@/lib/haptics";

interface ResultBarProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  onExpand: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
}

/**
 * Mobile "mini player" result card — sits above the bottom tab bar.
 * Tapping it opens the result bottom sheet via the onExpand callback.
 * Hidden on desktop (xl:hidden).
 */
export const ResultBar = memo(function ResultBar({
  result,
  isPending,
  onStar,
  isStarred,
  onExpand,
  onCompare,
  canCompare = false,
  isInCompare = false,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
}: ResultBarProps) {
  const tBase = useTranslations();
  const t = useTranslations("result");

  const animatedTotal = useAnimatedNumber(result?.grandTotalAmount ?? 0);

  function fmtAnimated(animated: number, reference: number): string {
    const dot = String(reference).indexOf(".");
    const dec = dot === -1 ? 0 : String(reference).length - dot - 1;
    return animated.toFixed(dec);
  }

  if (!result) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 xl:hidden"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-3 mb-1">
        <button
          type="button"
          onClick={onExpand}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2 shadow-lg shadow-black/8 transition-shadow active:shadow-md"
        >
          {/* Profile icon */}
          {normalizedProfile && (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-muted">
              <ProfileIcon category={normalizedProfile.iconKey} className="h-4 w-4" />
            </span>
          )}

          {/* Info */}
          <span className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-xs text-muted">
              {normalizedProfile?.shortLabel ?? result.profileLabel} · {resolveGradeLabel(result.gradeLabel, tBase)}
            </span>
            <span
              className={`flex items-baseline gap-2 transition-opacity duration-200 ${
                isPending ? "opacity-50" : ""
              }`}
            >
              <span className="text-lg font-bold tabular-nums tracking-tight">
                {fmtAnimated(animatedTotal, result.grandTotalAmount)}
                <span className="ml-0.5 text-xs font-semibold text-muted">
                  {CURRENCY_SYMBOLS[result.currency]}
                </span>
              </span>
              <span className="text-[11px] tabular-nums text-muted">
                {result.totalWeightKg} kg
              </span>
            </span>
          </span>

          {/* Action buttons (inline) */}
          <span className="flex shrink-0 items-center gap-1">
            {/* Star */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onStar(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onStar(); } }}
              className={`rounded-full p-1.5 transition-colors ${
                isStarred ? "bg-accent-surface" : ""
              }`}
              aria-label={isStarred ? t("removeFromSaved") : t("saveCalculation")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`h-4.5 w-4.5 transition-colors ${isStarred ? "fill-accent stroke-accent" : "fill-none stroke-muted-faint"}`} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </span>

            {/* Chevron up */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted-faint">
              <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.168l-3.71 3.602a.75.75 0 01-1.042-1.08l4.25-4.12a.75.75 0 011.042 0l4.25 4.12a.75.75 0 01-.02 1.1z" clipRule="evenodd" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Result bottom sheet (replaces full-screen overlay)                 */
/* ------------------------------------------------------------------ */

interface ResultOverlayProps {
  result: CalculationResult;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  isStarred: boolean;
  onStar: () => void;
  onClose: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
}

export const ResultOverlay = memo(function ResultOverlay({
  result,
  includeVat,
  wastePercent,
  vatPercent,
  isStarred,
  onStar,
  onClose,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
}: ResultOverlayProps) {
  const tBase = useTranslations();
  const t = useTranslations("result");

  return (
    <Drawer.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          triggerHaptic("light");
          onClose();
        }
      }}
      snapPoints={[0.55, 1]}
      activeSnapPoint={0.55}
      fadeFromIndex={0}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-overlay" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[95dvh] flex-col rounded-t-2xl bg-surface shadow-xl outline-none xl:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          {/* Title */}
          <Drawer.Title className="px-5 pb-2 text-center text-sm font-semibold text-foreground">
            {t("title")}
          </Drawer.Title>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* ── Hero: Total Cost + Weight summary ── */}
            <div className="border-b border-accent-border bg-linear-to-b from-accent-surface to-surface px-5 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                {t("totalCost")}
              </p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">
                {result.grandTotalAmount}
                <span className="ml-1 text-lg font-bold text-muted">{CURRENCY_SYMBOLS[result.currency]}</span>
              </p>
              <div className="mt-2 flex items-stretch justify-center gap-px">
                <span className="flex flex-col items-center rounded-l-md bg-surface/60 px-3 py-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{t("totalWeight")}</span>
                  <span className="text-sm font-semibold tabular-nums">{result.totalWeightKg} kg</span>
                </span>
                <span className="flex flex-col items-center rounded-r-md bg-surface/60 px-3 py-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{t("unitPrice")}</span>
                  <span className="text-sm font-semibold tabular-nums">{result.unitPriceAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
                </span>
              </div>
            </div>

            {/* ── Action buttons — immediately visible ── */}
            <div className="flex gap-2 border-b border-border-faint px-4 py-3">
              {/* Compare */}
              <button
                type="button"
                onClick={onCompare}
                disabled={!canCompare && !isInCompare}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  isInCompare
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                {isInCompare
                  ? t("inCompareCount", { count: compareCount, max: maxCompare })
                  : t("addToCompare")}
              </button>

              {/* Save */}
              <button
                type="button"
                onClick={onStar}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  isStarred
                    ? "border-accent-border bg-accent-surface text-accent"
                    : "border-border text-foreground-secondary hover:bg-surface-raised"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 ${
                    isStarred ? "fill-accent stroke-accent" : "fill-none stroke-current"
                  }`}
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isStarred ? t("saved") : t("save")}
              </button>

              {/* Project */}
              <button
                type="button"
                onClick={onAddToProject}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  hasProjects
                    ? "border-purple-border bg-purple-surface text-purple-text hover:bg-purple-surface"
                    : "border-border text-foreground-secondary hover:bg-surface-raised"
                }`}
                title={t("addToProject")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
                </svg>
                {t("project")}
              </button>
            </div>

            <div className="px-4 py-4">
              {/* ── Weight cards ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-raised px-3 py-2.5">
                  <p className="text-[11px] font-medium text-muted">{t("unitWeight")}</p>
                  <p className="mt-0.5 text-lg font-bold tracking-tight">
                    {result.unitWeightKg}{" "}
                    <span className="text-sm font-medium text-muted">kg</span>
                  </p>
                </div>
                <div className="rounded-lg bg-surface-raised px-3 py-2.5">
                  <p className="text-[11px] font-medium text-muted">{t("totalWeight")}</p>
                  <p className="mt-0.5 text-lg font-bold tracking-tight">
                    {result.totalWeightKg}{" "}
                    <span className="text-sm font-medium text-muted">kg</span>
                  </p>
                </div>
              </div>

              {/* ── Detail rows ── */}
              <div className="mt-4 space-y-0 text-sm">
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
                  <span className="font-medium text-right">{resolveGradeLabel(result.gradeLabel, tBase)}</span>
                </div>
                <div className="flex items-baseline justify-between py-2">
                  <span className="text-muted">{t("unitPrice")}</span>
                  <span className="font-medium text-right">
                    {result.unitPriceAmount} {CURRENCY_SYMBOLS[result.currency]}/{result.priceUnit ?? "kg"}
                  </span>
                </div>
              </div>

              {/* ── Cost Breakdown ── */}
              <div className="mt-3">
                <details className="group rounded-lg border border-border-faint" open>
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

              {/* ── Full calculation steps (inline collapsible) ── */}
              <details className="mt-4 border-t border-border-faint pt-3">
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
                className="mt-3 text-xs text-muted-faint"
              />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
});
