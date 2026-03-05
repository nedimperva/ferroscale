"use client";

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CompareItem } from "@/hooks/useCompare";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";

interface CompareChartProps {
  items: CompareItem[];
}

/**
 * Horizontal bar chart comparing weight and cost across items.
 * Pure CSS — no charting library needed.
 */
export const CompareChart = memo(function CompareChart({ items }: CompareChartProps) {
  const t = useTranslations("compare");

  const { maxWeight, maxCost, currency } = useMemo(() => {
    let maxW = 0;
    let maxC = 0;
    for (const item of items) {
      if (item.result.totalWeightKg > maxW) maxW = item.result.totalWeightKg;
      if (item.result.grandTotalAmount > maxC) maxC = item.result.grandTotalAmount;
    }
    return {
      maxWeight: maxW || 1,
      maxCost: maxC || 1,
      currency: items[0]?.result.currency ?? "EUR",
    };
  }, [items]);

  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  return (
    <div className="rounded-lg border border-border bg-surface-inset/30 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-faint">
        {t("chartTitle")}
      </p>
      <div className="space-y-2.5">
        {items.map((item) => {
          const weightPct = (item.result.totalWeightKg / maxWeight) * 100;
          const costPct = (item.result.grandTotalAmount / maxCost) * 100;
          const shortLabel = item.normalizedProfile.shortLabel;

          return (
            <div key={item.id} className="space-y-1">
              <p className="truncate text-xs font-medium text-foreground-secondary">
                {shortLabel}
              </p>
              {/* Weight bar */}
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-inset">
                  <div
                    className="h-full rounded-full bg-blue-strong transition-all duration-300"
                    style={{ width: `${Math.max(weightPct, 2)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right font-mono text-[11px] text-foreground-secondary">
                  {item.result.totalWeightKg} kg
                </span>
              </div>
              {/* Cost bar */}
              {item.result.grandTotalAmount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
                    <div
                      className="h-full rounded-full bg-amber-500/70 transition-all duration-300"
                      style={{ width: `${Math.max(costPct, 2)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono text-[10px] text-muted">
                    {currencySymbol}{item.result.grandTotalAmount}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
