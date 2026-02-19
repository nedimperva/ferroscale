"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CompareItem } from "@/hooks/useCompare";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";

interface CompareCardProps {
  item: CompareItem;
  /** The first item in the compare list — used as reference for diff percentages. */
  reference: CompareItem | null;
  onRemove: (id: string) => void;
}

/** Format a percentage diff vs reference. Returns null when there is no reference or same item. */
function diffLabel(current: number, reference: number): { text: string; positive: boolean } | null {
  if (reference === 0) return null;
  const pct = ((current - reference) / Math.abs(reference)) * 100;
  if (Math.abs(pct) < 0.1) return null;
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)}%`, positive: pct < 0 };
}

export const CompareCard = memo(function CompareCard({
  item,
  reference,
  onRemove,
}: CompareCardProps) {
  const tBase = useTranslations();
  const t = useTranslations("compare");
  const r = item.result;
  const isRef = reference === null || reference.id === item.id;

  const gradeLabel = resolveGradeLabel(r.gradeLabel, tBase);

  const weightDiff = isRef ? null : diffLabel(r.totalWeightKg, reference!.result.totalWeightKg);
  const costDiff = isRef ? null : diffLabel(r.grandTotalAmount, reference!.result.grandTotalAmount);
  const unitWeightDiff = isRef ? null : diffLabel(r.unitWeightKg, reference!.result.unitWeightKg);

  return (
    <div className="relative flex flex-col rounded-lg border border-border bg-surface">
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 rounded-md p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
        aria-label={t("remove")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>

      {/* Reference badge */}
      {isRef && (
        <div className="mx-3 mt-3 mb-1 w-fit rounded-full bg-surface-inset px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t("reference")}
        </div>
      )}

      {/* Profile + Material */}
      <div className={`px-3 ${isRef ? "pt-1" : "pt-3"} pb-2`}>
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-inset text-muted">
            <ProfileIcon category={item.normalizedProfile.iconKey} className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{item.normalizedProfile.shortLabel}</span>
        </p>
        <p className="truncate text-xs text-muted">{gradeLabel}</p>
      </div>

      {/* Grand total */}
      <div className="border-t border-border-faint px-3 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
          {t("totalCost")}
        </p>
        <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
          {r.grandTotalAmount}
        </p>
        <p className="text-xs font-medium text-muted">{CURRENCY_SYMBOLS[r.currency]}</p>
        {costDiff && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              costDiff.positive
                ? "bg-green-surface text-green-text"
                : "bg-red-surface text-red-text"
            }`}
          >
            {costDiff.text}
          </span>
        )}
      </div>

      {/* Weight rows */}
      <div className="border-t border-border-faint px-3 py-2 text-sm">
        <div className="flex items-baseline justify-between py-1">
          <span className="text-muted">{t("unitWeight")}</span>
          <span className="flex items-baseline gap-1.5 font-medium">
            {r.unitWeightKg} kg
            {unitWeightDiff && (
              <span
                className={`text-[10px] font-semibold ${
                  unitWeightDiff.positive ? "text-green-text" : "text-red-interactive"
                }`}
              >
                {unitWeightDiff.text}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-1">
          <span className="text-muted">{t("totalWeight")}</span>
          <span className="flex items-baseline gap-1.5 font-medium">
            {r.totalWeightKg} kg
            {weightDiff && (
              <span
                className={`text-[10px] font-semibold ${
                  weightDiff.positive ? "text-green-text" : "text-red-interactive"
                }`}
              >
                {weightDiff.text}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Price detail */}
      <div className="border-t border-border-faint px-3 py-2 text-xs text-muted">
        <div className="flex justify-between py-0.5">
          <span>{t("subtotal")}</span>
           <span className="text-foreground-secondary">{r.subtotalAmount} {CURRENCY_SYMBOLS[r.currency]}</span>
        </div>
        {r.wasteAmount > 0 && (
          <div className="flex justify-between py-0.5">
            <span>{t("waste")}</span>
            <span className="text-foreground-secondary">{r.wasteAmount} {CURRENCY_SYMBOLS[r.currency]}</span>
          </div>
        )}
        {r.vatAmount > 0 && (
          <div className="flex justify-between py-0.5">
            <span>{t("vat")}</span>
            <span className="text-foreground-secondary">{r.vatAmount} {CURRENCY_SYMBOLS[r.currency]}</span>
          </div>
        )}
      </div>
    </div>
  );
});
