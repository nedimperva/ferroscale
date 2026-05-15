"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  result: CalculationResult | null;
  isPending: boolean;
  isSaved: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
  onSave: () => void;
  onAddToProject: () => void;
  hasProjects: boolean;
  canAddToProject: boolean;
}

function fmtKg(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0.0";
  if (value >= 10000) return Math.round(value).toLocaleString();
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function fmtPrice(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * D3 "Bench" workshop dark live-result bar. Sits at the top of the
 * desktop form pane: black background, profile glyph, big tabular
 * weight + price, Save and Add-to-project actions.
 */
export const DesktopMiniResult = memo(function DesktopMiniResult({
  result,
  isPending,
  isSaved,
  normalizedProfile,
  onSave,
  onAddToProject,
  hasProjects,
  canAddToProject,
}: Props) {
  const t = useTranslations();
  const animatedWeight = useAnimatedNumber(result?.totalWeightKg ?? 0);
  const animatedTotal = useAnimatedNumber(result?.grandTotalAmount ?? 0);
  const currency = result ? CURRENCY_SYMBOLS[result.currency] ?? result.currency : "€";
  const iconKey = normalizedProfile?.iconKey ?? "structural";

  return (
    <div
      className={`flex items-center justify-between rounded-2xl bg-foreground px-5 py-4 text-background shadow-[0_14px_30px_-18px_rgba(20,18,15,0.4)] transition-opacity ${
        isPending ? "opacity-80" : "opacity-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-background">
          <ProfileIcon category={iconKey} className="h-6 w-6" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-2xs font-bold uppercase tracking-[0.16em] text-background/60">
            {isPending ? t("mobileCalc.calculating") : t("mobileCalc.live")}
          </span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[2.25rem] font-bold leading-none tracking-[-0.04em] tabular-nums">
              {fmtKg(animatedWeight)}
            </span>
            <span className="text-base font-semibold text-accent">kg</span>
            <span className="ml-3 text-base font-semibold tabular-nums text-background/85">
              {currency}&nbsp;{fmtPrice(animatedTotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            onSave();
          }}
          disabled={!result}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold text-background transition-colors hover:bg-white/15 active:bg-white/20 disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          {isSaved ? t("mobileResult.saved") : t("mobileResult.save")}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onAddToProject();
          }}
          disabled={!canAddToProject}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4M5 7l1 13a2 2 0 002 2h8a2 2 0 002-2l1-13" />
          </svg>
          {hasProjects
            ? t("mobileResult.addToProject")
            : t("mobileResult.newProject")}
        </button>
      </div>
    </div>
  );
});
