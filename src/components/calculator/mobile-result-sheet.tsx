"use client";

import { memo } from "react";
import { Drawer } from "vaul";
import { useTranslations } from "next-intl";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { CompareTray } from "./compare-tray";
import type { CompareItem } from "@/hooks/useCompare";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  result: CalculationResult;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  isSaved: boolean;
  onOpenSaveDialog: () => void;
  onClose: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
  compareItems?: CompareItem[];
  onRemoveCompareItem?: (id: string) => void;
  onOpenCompare?: () => void;
}

function fmt(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtWeight(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0.0";
  if (value >= 10000) return fmt(value, 0);
  if (value >= 1000) return fmt(value, 0);
  if (value >= 100) return fmt(value, 1);
  return fmt(value, 2);
}

export const MobileResultSheet = memo(function MobileResultSheet({
  result,
  wastePercent,
  vatPercent,
  includeVat,
  isSaved,
  onOpenSaveDialog,
  onClose,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
  compareItems = [],
  onRemoveCompareItem,
  onOpenCompare,
}: Props) {
  const t = useTranslations();
  const currency = CURRENCY_SYMBOLS[result.currency] ?? result.currency;
  const animatedTotal = useAnimatedNumber(result.grandTotalAmount);
  const animatedWeight = useAnimatedNumber(result.totalWeightKg);

  const profileShort = normalizedProfile?.shortLabel ?? result.profileLabel;

  const perPieceKg = result.quantity > 0 ? result.totalWeightKg / result.quantity : 0;
  const totalLengthM =
    result.quantity > 0
      ? (result.lengthMm * result.quantity) / 1000
      : result.lengthMm / 1000;

  const breakdown = [
    {
      label: t("mobileResult.linearWeight"),
      value: fmt(result.unitWeightKg * (1000 / Math.max(1, result.lengthMm)), 2),
      unit: "kg/m",
    },
    {
      label: t("mobileResult.lengthPerPiece"),
      value: fmt(result.lengthMm / 1000, 3),
      unit: "m",
    },
    {
      label: t("mobileResult.weightPerPiece"),
      value: fmt(perPieceKg, 2),
      unit: "kg",
    },
    {
      label: t("mobileResult.pieces"),
      value: String(result.quantity),
      unit: "×",
    },
  ];

  if (wastePercent > 0) {
    breakdown.push({
      label: t("mobileResult.waste"),
      value: `+ ${wastePercent}%`,
      unit: "",
    });
  }

  if (includeVat && vatPercent > 0) {
    breakdown.push({
      label: t("mobileResult.vat"),
      value: `+ ${vatPercent}%`,
      unit: "",
    });
  }

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
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-overlay backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[95dvh] flex-col rounded-t-[1.75rem] border-t border-border-faint bg-surface shadow-[var(--panel-shadow-strong)] outline-none lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-9 rounded-full bg-border-strong/70" />
          </div>

          <Drawer.Title className="sr-only">{t("result.title")}</Drawer.Title>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
            {/* Hero */}
            <div className="flex items-start justify-between gap-3 pb-1">
              <div className="flex min-w-0 flex-col">
                <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                  {profileShort} · {result.gradeLabel}
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[4.25rem] font-bold leading-[0.9] tracking-[-0.045em] tabular-nums text-foreground">
                    {fmtWeight(animatedWeight)}
                  </span>
                  <span className="text-2xl font-semibold tracking-tight text-accent">
                    kg
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5 text-sm">
                  <span className="font-semibold tabular-nums text-foreground-secondary">
                    {currency} {fmt(animatedTotal, 2)}
                  </span>
                  <span className="text-muted">
                    · {fmt(result.unitPriceAmount, 2)} {currency}/kg
                  </span>
                </div>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-foreground">
                <ProfileGlyph profileId={result.profileId} size="lg" />
              </div>
            </div>

            {/* Quick stats — visible in peek */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <QuickStat
                label={t("mobileResult.perPiece")}
                value={`${fmt(perPieceKg, perPieceKg >= 100 ? 1 : 2)} kg`}
              />
              <QuickStat
                label={t("mobileResult.perMetre")}
                value={`${fmt(result.unitWeightKg * (1000 / Math.max(1, result.lengthMm)), 1)} kg`}
              />
              <QuickStat
                label={t("mobileResult.length")}
                value={`${fmt(totalLengthM, totalLengthM >= 100 ? 1 : 2)} m`}
              />
            </div>

            {/* Primary actions — visible in peek */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  onOpenSaveDialog();
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background active:bg-foreground/90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                {isSaved ? t("mobileResult.saved") : t("mobileResult.save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onCompare?.();
                }}
                disabled={!canCompare && !isInCompare}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isInCompare
                    ? "border-accent-border bg-accent-surface text-accent-text"
                    : "border-border bg-surface-raised text-foreground active:bg-surface-inset"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                {isInCompare ? t("compareTray.pinned") : t("compareTray.pin")}
              </button>
            </div>

            {compareItems.length > 0 && onRemoveCompareItem && onOpenCompare && (
              <div className="mt-2">
                <CompareTray
                  items={compareItems}
                  onRemove={onRemoveCompareItem}
                  onOpen={onOpenCompare}
                />
              </div>
            )}

            {/* Hint between peek and full */}
            <div className="mt-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                {t("mobileResult.breakdown")}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Breakdown — peeks into view; full reveals all */}
            <div className="mt-3 flex flex-col">
              {breakdown.map((line, idx) => (
                <div
                  key={`${line.label}-${idx}`}
                  className="flex items-baseline justify-between border-b border-border py-2"
                >
                  <span className="text-sm text-foreground-secondary">{line.label}</span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {line.value}
                    </span>
                    {line.unit && (
                      <span className="min-w-[1.75rem] text-right text-xs text-muted">
                        {line.unit}
                      </span>
                    )}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between border-t-2 border-foreground py-2.5">
                <span className="text-sm font-bold text-foreground">
                  {t("mobileResult.totalWeight")}
                </span>
                <span className="text-base font-bold tabular-nums tracking-tight text-foreground">
                  {fmt(result.totalWeightKg, 2)} kg
                </span>
              </div>
            </div>

            {/* Secondary action in full view — full-width Add to project.
                Save lives in the peek above; no duplicate here. */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                onAddToProject?.();
              }}
              disabled={!onAddToProject}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white active:bg-accent-hover disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4M5 7l1 13a2 2 0 002 2h8a2 2 0 002-2l1-13" />
              </svg>
              {hasProjects ? t("mobileResult.addToProject") : t("mobileResult.newProject")}
            </button>

            <p className="mt-4 text-center text-2xs text-muted">
              {t("mobileResult.swipeHint")}
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
});

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-raised px-3 py-2">
      <span className="block text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="mt-1 block text-sm font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </span>
    </div>
  );
}
