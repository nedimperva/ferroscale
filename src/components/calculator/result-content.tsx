"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileGeometryDiagram } from "@/components/profiles/profile-geometry-diagram";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ReferenceList } from "./reference-list";
import { triggerHaptic } from "@/lib/haptics";

function formatMm2(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
    useGrouping: true,
  }).format(value);
}

function formatDensityKgM3(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    useGrouping: true,
  }).format(value);
}

function formatLengthMm(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
    useGrouping: true,
  }).format(value);
}

export function formatResultForClipboard(
  result: CalculationResult,
  profileLabel: string,
): string {
  const currency = CURRENCY_SYMBOLS[result.currency];
  const lines = [
    `${profileLabel}`,
    `A: ${formatMm2(result.areaMm2)} mm² · ρ: ${formatDensityKgM3(result.densityKgPerM3)} kg/m³ (${result.formulaLabel})`,
    `Length (per piece): ${formatLengthMm(result.lengthMm)} mm`,
    `Quantity: ${result.quantity}`,
    ...(result.profileReferenceLabel ? [`Profile standard: ${result.profileReferenceLabel}`] : []),
    ...(result.standardSizeReferenceLabel ? [`Size / table: ${result.standardSizeReferenceLabel}`] : []),
    ...(result.materialReferenceLabel ? [`Material standard: ${result.materialReferenceLabel}`] : []),
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
  onRemoveSaved: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
  weightAsMain?: boolean;
}

export const ResultContent = memo(function ResultContent({
  result,
  includeVat,
  wastePercent,
  vatPercent,
  isSaved,
  onOpenSaveDialog,
  onRemoveSaved,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
  weightAsMain = false,
}: ResultContentProps) {
  const tBase = useTranslations();
  const t = useTranslations("result");

  const animatedTotal = useAnimatedNumber(result.grandTotalAmount);
  const animatedUnitWeight = useAnimatedNumber(result.unitWeightKg);
  const animatedTotalWeight = useAnimatedNumber(result.totalWeightKg);

  function fmtAnimated(animated: number, reference: number): string {
    const dot = String(reference).indexOf(".");
    const dec = dot === -1 ? 0 : String(reference).length - dot - 1;
    return animated.toFixed(dec);
  }

  const profileLabel = normalizedProfile?.shortLabel ?? result.profileLabel;
  const gradeLabel = resolveGradeLabel(result.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[result.currency];
  const priceUnit = result.priceUnit ?? "kg";

  const isMulti = result.quantity > 1;

  const profileRef = result.profileReferenceLabel ?? null;
  const sizeRef = result.standardSizeReferenceLabel ?? null;
  const materialRef = result.materialReferenceLabel ?? null;
  const specLabelSet = useMemo(
    () => new Set([profileRef, sizeRef, materialRef].filter((x): x is string => Boolean(x))),
    [profileRef, sizeRef, materialRef],
  );
  const referenceListLabels = useMemo(
    () => result.referenceLabels.filter((label) => !specLabelSet.has(label)),
    [result.referenceLabels, specLabelSet],
  );

  return (
    <>
      {/* ── Hero ── */}
      <div className="border-b border-accent-border bg-linear-to-b from-accent-surface to-surface px-5 py-4 text-center">
        {/* Primary value */}
        <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight text-foreground transition-all duration-300">
          {weightAsMain
            ? fmtAnimated(animatedTotalWeight, result.totalWeightKg)
            : fmtAnimated(animatedTotal, result.grandTotalAmount)}
          <span className="ml-1 text-lg font-bold text-accent">
            {weightAsMain ? "kg" : currency}
          </span>
        </p>
        {/* Secondary value */}
        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground-secondary">
          {weightAsMain
            ? fmtAnimated(animatedTotal, result.grandTotalAmount)
            : fmtAnimated(animatedTotalWeight, result.totalWeightKg)}
          <span className="ml-0.5 text-sm font-medium text-muted">
            {weightAsMain ? currency : "kg"}
          </span>
        </p>
        {/* Profile + material subtitle */}
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-muted">
          {normalizedProfile && (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-surface-inset">
              <ProfileIcon category={normalizedProfile.iconKey} className="h-3 w-3" />
            </span>
          )}
          <span className="truncate">{profileLabel} · {gradeLabel}</span>
        </p>

        {/* Compact geometry + formula (always visible; full steps still in details below) */}
        <div
          className="mt-3 border-t border-accent-border/60 pt-3"
          role="group"
          aria-label={t("geometrySummary")}
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <div
              className="shrink-0 rounded-lg border border-accent-border/50 bg-surface/80 p-2 text-muted"
              aria-hidden
            >
              <ProfileGeometryDiagram profileId={result.profileId} className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[11px] leading-snug text-muted tabular-nums">
                <span className="text-foreground-secondary">
                  {formatMm2(result.areaMm2)} mm²
                </span>
                <span className="mx-1.5 text-border-faint" aria-hidden>
                  ·
                </span>
                <span className="text-foreground-secondary">
                  {formatDensityKgM3(result.densityKgPerM3)} kg/m³
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted">{result.formulaLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Run context: length, quantity, EN notes (deduped from reference list below) ── */}
      <div
        className="border-b border-border-faint bg-surface-inset/50 px-4 py-3 text-left"
        role="region"
        aria-label={t("calculationContext")}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("calculationContext")}</p>
        <dl className="mt-2 space-y-2 text-xs">
          <div>
            <dt className="font-medium text-foreground-secondary">{t("pieceLength")}</dt>
            <dd className="mt-0.5 tabular-nums text-muted">{formatLengthMm(result.lengthMm)} mm</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground-secondary">{t("quantityHeading")}</dt>
            <dd className="mt-0.5 text-muted">{t("pieces", { qty: result.quantity })}</dd>
          </div>
          {profileRef ? (
            <div>
              <dt className="font-medium text-foreground-secondary">{t("profileStandard")}</dt>
              <dd className="mt-0.5 leading-snug text-muted">{profileRef}</dd>
            </div>
          ) : null}
          {sizeRef ? (
            <div>
              <dt className="font-medium text-foreground-secondary">{t("sizeStandard")}</dt>
              <dd className="mt-0.5 leading-snug text-muted">{sizeRef}</dd>
            </div>
          ) : null}
          {materialRef ? (
            <div>
              <dt className="font-medium text-foreground-secondary">{t("materialStandard")}</dt>
              <dd className="mt-0.5 leading-snug text-muted">{materialRef}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-2 border-b border-border-faint px-4 py-3">
        {/* Compare */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onCompare?.();
          }}
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

        {/* Save / Saved */}
        <button
          type="button"
          onClick={() => {
            if (isSaved) {
              triggerHaptic("light");
              onRemoveSaved();
            } else {
              triggerHaptic("success");
              onOpenSaveDialog();
            }
          }}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
            isSaved
              ? "border-accent-border bg-accent-surface text-accent"
              : "border-border text-foreground-secondary hover:bg-surface-raised"
          }`}
        >
          <motion.svg
            key={isSaved ? "saved" : "unsaved"}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 ${
              isSaved ? "fill-accent stroke-accent" : "fill-none stroke-current"
            }`}
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </motion.svg>
          {isSaved ? t("saved") : t("save")}
        </button>

        {/* Project */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onAddToProject?.();
          }}
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

        {/* Copy */}
        <CopyButton result={result} normalizedProfile={normalizedProfile} />
      </div>

      {/* ── Receipt body ── */}
      <div className="px-4 py-4 text-sm">
        {/* Weight section */}
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t("unitWeight")}</span>
          <span className="tabular-nums">{fmtAnimated(animatedUnitWeight, result.unitWeightKg)} kg</span>
        </div>
        {isMulti && (
          <>
            <div className="flex justify-between py-1.5 text-muted">
              <span>× {t("pieces", { qty: result.quantity })}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted">{t("totalWeight")}</span>
              <span className="tabular-nums font-medium">{fmtAnimated(animatedTotalWeight, result.totalWeightKg)} kg</span>
            </div>
          </>
        )}

        {result.surfaceAreaM2 != null && (
          <>
            <hr className="my-2 border-border-faint" />
            <div className="flex justify-between py-1.5">
              <span className="text-muted">{t("surfaceArea")}</span>
              <span className="tabular-nums">{result.surfaceAreaM2} m²</span>
            </div>
          </>
        )}

        <hr className="my-2 border-border-faint" />

        {/* Cost section */}
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t("unitPrice")}</span>
          <span className="tabular-nums">{result.unitPriceAmount} {currency}/{priceUnit}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-muted">{t("subtotal")}</span>
          <span className="tabular-nums">{result.subtotalAmount} {currency}</span>
        </div>
        {result.wasteAmount > 0 && (
          <div className="flex justify-between py-1.5">
            <span className="text-muted">{t("waste", { percent: wastePercent })}</span>
            <span className="tabular-nums">{result.wasteAmount} {currency}</span>
          </div>
        )}
        {includeVat && (
          <div className="flex justify-between py-1.5">
            <span className="text-muted">{t("vat", { percent: vatPercent })}</span>
            <span className="tabular-nums">{result.vatAmount} {currency}</span>
          </div>
        )}

        {/* Grand total */}
        <div className="mt-2 flex justify-between border-y-2 border-border py-2.5 font-semibold">
          <span>{t("grandTotal")}</span>
          <span className="tabular-nums text-accent">{fmtAnimated(animatedTotal, result.grandTotalAmount)} {currency}</span>
        </div>

        {/* ── References (dataset + links); EN lines shown above are omitted here to avoid duplicate prose ── */}
        {referenceListLabels.length > 0 ? (
          <ReferenceList
            labels={referenceListLabels}
            className="mt-3 border-t border-border-faint pt-3 text-xs leading-snug text-muted [&_ul]:mt-1 [&_ul]:space-y-0.5"
          />
        ) : null}

        {/* ── Full calculation steps ── */}
        <details
          className="mt-4 border-t border-border-faint pt-3"
          onToggle={(e) => {
            if ((e.target as HTMLDetailsElement).open) {
              triggerHaptic("light");
            }
          }}
        >
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
      </div>
    </>
  );
});

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
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
        copied
          ? "border-green-border bg-green-surface text-green-text"
          : "border-border text-foreground-secondary hover:bg-surface-raised"
      }`}
      aria-label={t("copyAriaLabel")}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
