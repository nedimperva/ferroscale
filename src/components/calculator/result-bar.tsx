"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { ResultContent } from "./result-content";
import { triggerHaptic } from "@/lib/haptics";

interface ResultBarProps {
  result: CalculationResult | null;
  isPending: boolean;
  onExpand: () => void;
  normalizedProfile?: NormalizedProfileSnapshot | null;
  weightAsMain?: boolean;
}

export const ResultBar = memo(function ResultBar(props: ResultBarProps) {
  const {
    result,
    isPending,
    onExpand,
    normalizedProfile = null,
    weightAsMain = false,
  } = props;
  const t = useTranslations("result");

  const animatedTotal = useAnimatedNumber(result?.grandTotalAmount ?? 0);
  const animatedWeight = useAnimatedNumber(result?.totalWeightKg ?? 0);

  function fmtAnimated(animated: number, reference: number): string {
    const dot = String(reference).indexOf(".");
    const dec = dot === -1 ? 0 : String(reference).length - dot - 1;
    return animated.toFixed(dec);
  }

  const primaryValue = weightAsMain
    ? fmtAnimated(animatedWeight, result?.totalWeightKg ?? 0)
    : fmtAnimated(animatedTotal, result?.grandTotalAmount ?? 0);
  const primaryUnit = result
    ? weightAsMain ? "kg" : CURRENCY_SYMBOLS[result.currency]
    : "";
  const secondaryValue = weightAsMain
    ? fmtAnimated(animatedTotal, result?.grandTotalAmount ?? 0)
    : fmtAnimated(animatedWeight, result?.totalWeightKg ?? 0);
  const secondaryUnit = result
    ? weightAsMain ? CURRENCY_SYMBOLS[result.currency] : "kg"
    : "";

  return (
    <AnimatePresence>
      {result && (
        <motion.button
          key="result-chip"
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onExpand();
          }}
          initial={{ y: 20, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          aria-label={t("expandAriaLabel")}
          className="group fixed z-40 flex min-w-[10.5rem] max-w-[14rem] items-center gap-2.5 rounded-xl border border-border bg-surface/96 px-3 py-2 text-left shadow-[0_18px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-shadow hover:shadow-[0_22px_44px_rgba(15,23,42,0.22)]"
          style={{
            bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            right: "calc(1rem + env(safe-area-inset-right, 0px))",
          }}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent ring-1 ring-accent/15">
            {normalizedProfile ? (
              <ProfileIcon category={normalizedProfile.iconKey} className="h-4 w-4" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
              </svg>
            )}
          </span>

          <span
            className={`flex min-w-0 flex-1 flex-col leading-tight transition-opacity duration-200 ${
              isPending ? "opacity-60" : ""
            }`}
          >
            <span className="flex items-baseline gap-1">
              <span className="select-text text-base font-extrabold tabular-nums tracking-tight text-foreground">
                {primaryValue}
              </span>
              <span className="text-[11px] font-semibold text-accent">{primaryUnit}</span>
            </span>
            <span className="mt-0.5 flex items-baseline gap-1">
              <span className="select-text text-xs font-semibold tabular-nums text-foreground-secondary">
                {secondaryValue}
              </span>
              <span className="text-[10px] font-medium text-muted">{secondaryUnit}</span>
            </span>
          </span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 shrink-0 text-muted-faint transition-transform group-hover:-translate-y-0.5"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

interface ResultOverlayProps {
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
  weightAsMain?: boolean;
}

export const ResultOverlay = memo(function ResultOverlay({
  result,
  includeVat,
  wastePercent,
  vatPercent,
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
  weightAsMain = false,
}: ResultOverlayProps) {
  const t = useTranslations("result");
  useDrawerBehavior(true, () => {
    triggerHaptic("light");
    onClose();
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 md:p-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-overlay backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: 12, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 12, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex max-h-full w-full max-w-[36rem] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-3 top-3 z-20 rounded-md p-1.5 text-muted-faint transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ResultContent
            result={result}
            includeVat={includeVat}
            wastePercent={wastePercent}
            vatPercent={vatPercent}
            isSaved={isSaved}
            onOpenSaveDialog={onOpenSaveDialog}
            onCompare={onCompare}
            canCompare={canCompare}
            isInCompare={isInCompare}
            compareCount={compareCount}
            maxCompare={maxCompare}
            onAddToProject={onAddToProject}
            hasProjects={hasProjects}
            normalizedProfile={normalizedProfile}
            weightAsMain={weightAsMain}
            layout="sheet"
          />
        </div>
      </motion.div>
    </div>
  );
});
