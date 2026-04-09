"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Drawer } from "vaul";
import { useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ResultContent } from "./result-content";
import { ResultActionsSheet } from "./result-actions-sheet";
import { triggerHaptic } from "@/lib/haptics";

interface ResultBarProps {
  result: CalculationResult | null;
  isPending: boolean;
  onExpand: () => void;
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
}

export const ResultBar = memo(function ResultBar(props: ResultBarProps) {
  const {
    result,
    isPending,
    onExpand,
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
  } = props;
  const tBase = useTranslations();
  const t = useTranslations("result");

  const [showActions, setShowActions] = useState(false);

  const animatedTotal = useAnimatedNumber(result?.grandTotalAmount ?? 0);
  const animatedWeight = useAnimatedNumber(result?.totalWeightKg ?? 0);

  function fmtAnimated(animated: number, reference: number): string {
    const dot = String(reference).indexOf(".");
    const dec = dot === -1 ? 0 : String(reference).length - dot - 1;
    return animated.toFixed(dec);
  }

  return (
    <>
      <AnimatePresence>
        {result && (
          <motion.div
            key="result-bar"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 z-40 lg:hidden"
            style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="panel-base mx-3 mb-1 rounded-[1.2rem] bg-surface/94 px-2 py-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onExpand}
                  aria-label={t("expandAriaLabel")}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[1rem] px-1 py-0.5 text-left"
                >
                  <span className="relative flex shrink-0 items-center justify-center">
                    {normalizedProfile ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-accent/12 text-accent ring-1 ring-accent/15">
                        <ProfileIcon category={normalizedProfile.iconKey} className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-accent/12 text-accent ring-1 ring-accent/15">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                        </svg>
                      </span>
                    )}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`flex items-baseline gap-1 transition-opacity duration-200 ${
                        isPending ? "opacity-60" : ""
                      }`}
                    >
                      <span className="select-text text-[1.18rem] font-extrabold tabular-nums tracking-tight text-foreground">
                        {weightAsMain
                          ? fmtAnimated(animatedWeight, result.totalWeightKg)
                          : fmtAnimated(animatedTotal, result.grandTotalAmount)}
                      </span>
                      <span className="text-[11px] font-semibold text-accent">
                        {weightAsMain ? "kg" : CURRENCY_SYMBOLS[result.currency]}
                      </span>
                      <span className="text-[10px] text-muted-faint">/</span>
                      <span className="select-text text-[13px] font-semibold tabular-nums text-foreground-secondary">
                        {weightAsMain
                          ? fmtAnimated(animatedTotal, result.grandTotalAmount)
                          : fmtAnimated(animatedWeight, result.totalWeightKg)}
                      </span>
                      <span className="text-[10px] font-medium text-muted">
                        {weightAsMain ? CURRENCY_SYMBOLS[result.currency] : "kg"}
                      </span>
                    </span>
                    <span className="mt-0.5 truncate text-[10px] leading-tight text-muted">
                      {normalizedProfile?.shortLabel ?? result.profileLabel} - {resolveGradeLabel(result.gradeLabel, tBase)}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setShowActions(true);
                  }}
                  className={`premium-segment inline-flex h-8 shrink-0 items-center justify-center gap-1.5 px-2.5 text-[11px] font-semibold leading-none ${
                    isSaved
                      ? "border-accent-border bg-accent-surface text-accent"
                      : "premium-segment-muted border-border-faint bg-surface-raised"
                  }`}
                  aria-label={t("moreActions")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
                    <path d="M4 7h16" />
                    <path d="M4 12h10" />
                    <path d="M4 17h16" />
                    <circle cx="17" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="leading-none">{t("actionsTitle")}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <ResultActionsSheet
          open={showActions}
          onClose={() => setShowActions(false)}
          canCompare={canCompare}
          isInCompare={isInCompare}
          compareCount={compareCount}
          maxCompare={maxCompare}
          onCompare={onCompare ?? (() => {})}
          isSaved={isSaved}
          onSave={onOpenSaveDialog}
          hasProjects={hasProjects}
          onAddToProject={onAddToProject ?? (() => {})}
        />
      )}
    </>
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
          className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[95dvh] flex-col rounded-t-[1.6rem] border-t border-border-faint bg-surface/98 shadow-[0_-18px_40px_rgba(15,23,42,0.18)] outline-none backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex justify-center pb-1 pt-3">
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          <Drawer.Title className="px-5 pb-2 text-center text-sm font-semibold text-foreground">
            {t("title")}
          </Drawer.Title>

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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
});
