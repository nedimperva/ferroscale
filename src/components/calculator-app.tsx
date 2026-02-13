"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCalculator } from "@/hooks/useCalculator";
import { useHistory } from "@/hooks/useHistory";
import { DATASET_VERSION } from "@/lib/datasets/version";
import { ContactForm } from "@/components/contact-form";

import { IssueList } from "@/components/calculator/issue-list";
import { MaterialSection } from "@/components/calculator/material-section";
import { ProfileSection } from "@/components/calculator/profile-section";
import { PricingSection } from "@/components/calculator/pricing-section";
import { PrecisionSection } from "@/components/calculator/precision-section";
import { ResultPanel } from "@/components/calculator/result-panel";
import { ResultBar, ResultOverlay } from "@/components/calculator/result-bar";
import { HistoryPanel } from "@/components/calculator/history-panel";

export function CalculatorApp() {
  const {
    input,
    dispatch,
    result,
    issues,
    isPending,
    selectedProfile,
    activeFamily,
    resetForm,
  } = useCalculator();

  const {
    history,
    starred,
    addToHistory,
    toggleStar,
    removeStarred,
    clearHistory,
  } = useHistory();

  /* Auto-save valid results to history */
  const prevResultRef = useRef(result);
  useEffect(() => {
    if (result && result !== prevResultRef.current) {
      addToHistory(input, result);
    }
    prevResultRef.current = result;
  }, [result, input, addToHistory]);

  /* Mobile overlay state */
  const [showOverlay, setShowOverlay] = useState(false);

  /* Star helpers — we star the most recent history entry matching the current result */
  const currentEntryId = history[0]?.id;
  const isCurrentStarred = currentEntryId
    ? starred.some((s) => s.id === currentEntryId)
    : false;

  const handleStar = useCallback(() => {
    if (currentEntryId) toggleStar(currentEntryId);
  }, [currentEntryId, toggleStar]);

  const handleLoad = useCallback(
    (loadedInput: typeof input) => {
      dispatch({ type: "LOAD_ENTRY", input: loadedInput });
    },
    [dispatch],
  );

  /* Mobile history drawer */
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 lg:pb-6">
      {/* ---- Header ---- */}
      <header className="mb-4 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Metal Calculator
        </h1>
        <p className="text-sm text-slate-600">
          Live weight &amp; price estimation for EN profiles.{" "}
          <span className="text-xs text-slate-400">
            Dataset {DATASET_VERSION}
          </span>
        </p>
      </header>

      {/* ---- Disclaimer (compact) ---- */}
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <strong>Estimate only</strong> — verify against project specs and supplier data.
      </div>

      {/* ---- Main grid ---- */}
      <div className="grid gap-4 lg:grid-cols-[5fr_3fr]">
        {/* LEFT — inputs */}
        <div className="grid gap-4 self-start rounded-lg border border-slate-200 bg-white p-4">
          <IssueList issues={issues} />

          <MaterialSection
            input={input}
            dispatch={dispatch}
            activeFamily={activeFamily}
            issues={issues}
          />

          <ProfileSection
            input={input}
            dispatch={dispatch}
            selectedProfile={selectedProfile}
            issues={issues}
          />

          {/* Pricing in a collapsible on mobile */}
          <details className="group lg:open" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 lg:pointer-events-none lg:list-none">
              Pricing
              <span className="ml-1 text-xs text-slate-400 group-open:hidden">
                ▸
              </span>
            </summary>
            <div className="mt-3">
              <PricingSection
                input={input}
                dispatch={dispatch}
                issues={issues}
              />
            </div>
          </details>

          {/* Precision in a collapsible on mobile */}
          <details className="group lg:open">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 lg:pointer-events-none lg:list-none">
              Precision
              <span className="ml-1 text-xs text-slate-400 group-open:hidden">
                ▸
              </span>
            </summary>
            <div className="mt-3">
              <PrecisionSection input={input} dispatch={dispatch} />
            </div>
          </details>

          {/* Reset */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Reset
            </button>
            {/* Mobile history toggle */}
            <button
              type="button"
              onClick={() => setShowMobileHistory((p) => !p)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
            >
              History
            </button>
          </div>

          {/* Mobile inline history (toggled) */}
          {showMobileHistory && (
            <div className="lg:hidden">
              <HistoryPanel
                history={history}
                starred={starred}
                onLoad={handleLoad}
                onToggleStar={toggleStar}
                onRemoveStarred={removeStarred}
                onClearHistory={clearHistory}
              />
            </div>
          )}
        </div>

        {/* RIGHT — results & history (desktop) */}
        <aside className="hidden gap-4 self-start lg:sticky lg:top-4 lg:grid">
          <ResultPanel
            result={result}
            isPending={isPending}
            onStar={handleStar}
            isStarred={isCurrentStarred}
            includeVat={input.includeVat}
          />
          <HistoryPanel
            history={history}
            starred={starred}
            onLoad={handleLoad}
            onToggleStar={toggleStar}
            onRemoveStarred={removeStarred}
            onClearHistory={clearHistory}
          />
        </aside>
      </div>

      {/* ---- Mobile sticky result bar ---- */}
      <ResultBar
        result={result}
        isPending={isPending}
        onStar={handleStar}
        isStarred={isCurrentStarred}
        onExpand={() => setShowOverlay(true)}
      />

      {/* ---- Mobile full-screen result overlay ---- */}
      {showOverlay && result && (
        <ResultOverlay
          result={result}
          includeVat={input.includeVat}
          isStarred={isCurrentStarred}
          onStar={handleStar}
          onClose={() => setShowOverlay(false)}
        />
      )}

      {/* ---- Contact ---- */}
      <section className="mt-6">
        <ContactForm
          context={
            result
              ? `${result.profileLabel} / ${result.gradeLabel} / total ${result.grandTotalAmount} ${result.currency}`
              : undefined
          }
        />
      </section>
    </div>
  );
}
