"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { UseQuickCalculatorReturn, QuickLineResult } from "@/hooks/useQuickCalculator";
import type { CalculationInput } from "@/lib/calculator/types";
import type { QuickWeightResult } from "@ferroscale/metal-core";
import { toCalculationInput } from "@ferroscale/metal-core/quick/calculate";
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

  // Focus the input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Close on Escape
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
        manualDimensionsMm: {},
        lengthMm: result.lengthMm,
        quantity: result.quantity,
        materialGradeId: result.materialGradeId,
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
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350, mass: 0.8 }}
            onAnimationStart={() => triggerHaptic("light")}
            className="fixed left-1/2 top-[12vh] z-[81] w-[95vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-muted"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("placeholder")}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-faint outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && lineResults.length === 1 && lineResults[0].result) {
                    e.preventDefault();
                    handleLoadResult(lineResults[0].result);
                  }
                }}
              />
              <kbd className="hidden rounded border border-border-faint bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-muted-faint sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto scroll-native">
              {lineResults.length === 0 && !query.trim() && recentQueries.length > 0 && (
                <div className="px-4 py-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-faint">
                    {t("recent")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentQueries.slice(0, 8).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleRecentClick(q)}
                        className="rounded-md border border-border-faint bg-surface-inset px-2 py-1 text-xs text-foreground-secondary transition-colors hover:bg-surface-raised"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {lineResults.length === 0 && !query.trim() && recentQueries.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-faint">{t("hint")}</p>
                  <p className="mt-1 font-mono text-xs text-muted">{t("hintExample")}</p>
                </div>
              )}

              {lineResults.map((lr, idx) => (
                <QuickResultRow
                  key={idx}
                  lineResult={lr}
                  onLoad={handleLoadResult}
                />
              ))}

              {/* Totals row when multi-line */}
              {successCount >= 2 && (
                <div className="flex items-center justify-between border-t border-border bg-surface-inset/50 px-4 py-2.5">
                  <span className="text-xs font-semibold text-foreground-secondary">{t("total")}</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {totalWeightKg} kg
                  </span>
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
    return (
      <div className="group flex items-center gap-3 border-b border-border-faint px-4 py-2.5 last:border-b-0 hover:bg-surface-inset/40">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {r.profileLabel}
          </p>
          <p className="truncate text-xs text-muted">
            {r.quantity > 1 && `${r.quantity}× `}
            {r.lengthMm}mm
            {r.unitWeightKg !== r.totalWeightKg && (
              <span className="ml-1.5">({r.unitWeightKg} kg/pc)</span>
            )}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
          {r.totalWeightKg} kg
        </span>
        <button
          type="button"
          onClick={() => onLoad(r)}
          className="shrink-0 rounded-md border border-border-faint bg-surface px-2 py-1 text-[11px] font-medium text-foreground-secondary opacity-0 transition-all hover:bg-surface-raised group-hover:opacity-100"
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
    <div className="flex items-center gap-3 border-b border-border-faint px-4 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted line-through">{lineResult.line}</p>
        {issue && (
          <p className="truncate text-xs text-red-interactive">{issue.message}</p>
        )}
      </div>
    </div>
  );
}
