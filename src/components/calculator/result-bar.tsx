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
  /* Actions */
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

/**
 * Mobile "mini player" result card — sits above the bottom tab bar.
 * Tapping it opens the result bottom sheet via the onExpand callback.
 * The ⋯ button opens an action sheet with Compare / Save / Project.
 * Hidden on desktop (lg:hidden).
 */
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
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed inset-x-0 z-40 lg:hidden"
            style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-3 mb-1">
              <button
                type="button"
                onClick={onExpand}
                aria-label={t("expandAriaLabel")}
                className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-accent-border/50 bg-surface/95 px-3.5 py-2.5 shadow-xl shadow-black/15 ring-1 ring-black/[0.03] backdrop-blur-xl transition-all active:scale-[0.98] active:shadow-lg"
              >
                {/* Profile icon */}
                <span className="relative flex shrink-0 items-center justify-center">
                  {normalizedProfile ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
                      <ProfileIcon category={normalizedProfile.iconKey} className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                      </svg>
                    </span>
                  )}
                </span>

                {/* Main value + secondary value */}
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span
                    className={`flex items-baseline gap-1.5 transition-opacity duration-200 ${
                      isPending ? "opacity-60" : ""
                    }`}
                  >
                    {/* Primary value */}
                    <span className="select-text text-lg font-extrabold tabular-nums tracking-tight text-foreground">
                      {weightAsMain
                        ? fmtAnimated(animatedWeight, result.totalWeightKg)
                        : fmtAnimated(animatedTotal, result.grandTotalAmount)}
                    </span>
                    <span className="text-xs font-semibold text-accent">
                      {weightAsMain ? "kg" : CURRENCY_SYMBOLS[result.currency]}
                    </span>
                    <span className="text-2xs text-muted-faint">·</span>
                    {/* Secondary value */}
                    <span className="select-text text-sm font-semibold tabular-nums text-foreground-secondary">
                      {weightAsMain
                        ? fmtAnimated(animatedTotal, result.grandTotalAmount)
                        : fmtAnimated(animatedWeight, result.totalWeightKg)}
                    </span>
                    <span className="text-2xs font-medium text-muted">
                      {weightAsMain ? CURRENCY_SYMBOLS[result.currency] : "kg"}
                    </span>
                  </span>
                  <span className="truncate text-2xs leading-tight text-muted">
                    {normalizedProfile?.shortLabel ?? result.profileLabel} · {resolveGradeLabel(result.gradeLabel, tBase)}
                  </span>
                </span>

                {/* ⋯ actions button + chevron */}
                <span className="flex shrink-0 items-center gap-1">
                  {/* More actions */}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      setShowActions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        triggerHaptic("light");
                        setShowActions(true);
                      }
                    }}
                    className={`rounded-full p-1.5 transition-colors ${
                      isSaved ? "bg-accent-surface text-accent" : "hover:bg-surface-inset"
                    }`}
                    aria-label={t("moreActions")}
                  >
                    {isSaved ? (
                      /* Filled bookmark when saved */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                    ) : (
                      /* Ellipsis when not saved */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-muted-faint">
                        <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  {/* Chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-muted-faint transition-transform group-hover:-translate-y-0.5">
                    <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.168l-3.71 3.602a.75.75 0 01-1.042-1.08l4.25-4.12a.75.75 0 011.042 0l4.25 4.12a.75.75 0 01-.02 1.1z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⋯ Action sheet */}
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

/* ------------------------------------------------------------------ */
/*  Result bottom sheet (replaces full-screen overlay)                 */
/* ------------------------------------------------------------------ */

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
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-overlay" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[95dvh] flex-col rounded-t-2xl bg-surface shadow-xl outline-none lg:hidden"
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

          {/* Scrollable content — shared with desktop */}
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
