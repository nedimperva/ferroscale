"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { UseQuickCalculatorReturn } from "@/hooks/useQuickCalculator";
import type { QuickLineResult } from "@/hooks/useQuickCalculator";
import type { CalculationInput } from "@/lib/calculator/types";
import type { QuickWeightResult } from "@ferroscale/metal-core";
import { toCalculationInput } from "@ferroscale/metal-core/quick/calculate";
import { getProfileById } from "@/lib/datasets/profiles";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { triggerHaptic } from "@/lib/haptics";

interface QuickCalcPaletteProps {
  quickCalc: UseQuickCalculatorReturn;
  onLoadEntry: (input: CalculationInput) => void;
}

export const QuickCalcPalette = memo(function QuickCalcPalette({
  quickCalc,
  onLoadEntry,
}: QuickCalcPaletteProps) {
  const t = useTranslations("quickCalc");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isOpen, close, query, setQuery, lineResults, totalWeightKg, recentQueries } = quickCalc;

  const lineResultsRef = useRef(lineResults);
  lineResultsRef.current = lineResults;

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  const handleLoadResult = useCallback(
    (result: QuickWeightResult) => {
      const request = {
        profileAlias: result.profileAlias,
        profileId: result.profileId,
        selectedSizeId: result.selectedSizeId,
        manualDimensionsMm: result.manualDimensionsMm,
        lengthMm: result.lengthMm,
        quantity: result.quantity,
        materialGradeId: result.materialGradeId,
        customDensityKgPerM3: result.customDensityKgPerM3,
        normalizedInput: result.normalizedInput,
      };
      const input = toCalculationInput(request);
      onLoadEntry(input);
      close();
    },
    [onLoadEntry, close],
  );

  const handleRecentClick = useCallback(
    (q: string) => {
      setQuery(q);
    },
    [setQuery],
  );

  const successCount = lineResults.filter((lr) => lr.result).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="qc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] bg-overlay"
            onClick={close}
            aria-hidden="true"
          />

          {/* Palette */}
          <motion.div
            key="qc-palette"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            onAnimationStart={() => triggerHaptic("light")}
            className="fixed left-1/2 top-[10vh] z-[81] w-[95vw] max-w-[520px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
          >
            {/* Header with input */}
            <div className="relative border-b border-border">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-inverted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-surface">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("placeholder")}
                    rows={1}
                    className="w-full resize-none bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-faint outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        const results = lineResultsRef.current;
                        const first = results.find((lr) => lr.result);
                        if (first?.result) {
                          e.preventDefault();
                          handleLoadResult(first.result);
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {successCount > 0 && (
                    <kbd className="hidden rounded-md border border-border-faint bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-flex items-center gap-0.5">
                      <span>&#9166;</span>
                    </kbd>
                  )}
                  <kbd className="hidden rounded-md border border-border-faint bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-muted-faint sm:inline-block">
                    ESC
                  </kbd>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[55vh] overflow-y-auto scroll-native">
              {/* Empty state: recent queries */}
              {lineResults.length === 0 && !query.trim() && recentQueries.length > 0 && (
                <div className="px-4 py-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-faint">
                    {t("recent")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentQueries.slice(0, 8).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleRecentClick(q)}
                        className="rounded-lg border border-border-faint bg-surface px-2.5 py-1.5 font-mono text-xs text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state: hint */}
              {lineResults.length === 0 && !query.trim() && recentQueries.length === 0 && (
                <div className="px-4 py-5">
                  <p className="text-xs text-muted-faint">{t("hint")}</p>
                  <div className="mt-3 space-y-1.5">
                    {["shs 40x40x2x4500mm", "rhs 120x80x4x6000", "ipe 200x6000 mat=s355", "chs 60.3x3.2x3000 qty=2", "plate 1500x10x3000"].map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setQuery(ex)}
                        className="block w-full rounded-lg border border-transparent px-2.5 py-1.5 text-left font-mono text-xs text-muted transition-colors hover:border-border-faint hover:bg-surface-inset hover:text-foreground-secondary"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-muted-faint">{t("multiLineHint")}</p>
                </div>
              )}

              {/* Results */}
              {lineResults.map((lr, idx) => (
                <QuickResultRow
                  key={idx}
                  lineResult={lr}
                  onLoad={handleLoadResult}
                />
              ))}

              {/* Multi-line totals */}
              {successCount >= 2 && (
                <div className="flex items-center justify-between border-t border-border bg-surface-inset/60 px-4 py-3">
                  <span className="text-xs font-semibold text-foreground-secondary">{t("total")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                      {totalWeightKg} kg
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

/* ---- Individual result row ---- */

function QuickResultRow({
  lineResult,
  onLoad,
}: {
  lineResult: QuickLineResult;
  onLoad: (result: QuickWeightResult) => void;
}) {
  const t = useTranslations("quickCalc");

  if (lineResult.result) {
    const r = lineResult.result;
    const profile = getProfileById(r.profileId);
    const category = profile?.category ?? "bars";

    return (
      <div className="group flex items-center gap-3 border-b border-border-faint/60 px-4 py-3 last:border-b-0 transition-colors hover:bg-surface-inset/40">
        {/* Profile icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-muted">
          <ProfileIcon category={category} className="h-4 w-4" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {r.profileLabel}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span>{r.lengthMm} mm</span>
            {r.quantity > 1 && (
              <span className="rounded bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                &times;{r.quantity}
              </span>
            )}
            {r.materialGradeId !== "steel-s235jr" && (
              <span className="rounded bg-blue-surface px-1.5 py-0.5 text-[10px] font-medium text-blue-text">
                {r.materialGradeId.split("-").pop()?.toUpperCase()}
              </span>
            )}
            {r.unitWeightKg !== r.totalWeightKg && (
              <span className="text-muted-faint">{r.unitWeightKg} kg/pc</span>
            )}
          </p>
        </div>

        {/* Weight */}
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
          {r.totalWeightKg} kg
        </span>

        {/* Load button */}
        <button
          type="button"
          onClick={() => onLoad(r)}
          className="shrink-0 rounded-lg border border-border-faint bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-foreground-secondary opacity-0 transition-all hover:border-border hover:bg-surface-raised group-hover:opacity-100"
          title={t("loadInCalculator")}
        >
          {t("load")}
        </button>
      </div>
    );
  }

  // Error row
  const issue = lineResult.issues?.[0];
  return (
    <div className="flex items-center gap-3 border-b border-border-faint/60 px-4 py-3 last:border-b-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-400 dark:bg-red-500/10 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted line-through">{lineResult.line}</p>
        {issue && (
          <p className="mt-0.5 truncate text-xs text-red-interactive">{issue.message}</p>
        )}
      </div>
    </div>
  );
}
