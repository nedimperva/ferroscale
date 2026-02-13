"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCalculator } from "@/hooks/useCalculator";
import { useHistory } from "@/hooks/useHistory";
import { DATASET_VERSION } from "@/lib/datasets/version";

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

  /* Star helpers */
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
    <div className="mx-auto max-w-7xl px-4 py-4 pb-24 md:px-6 lg:pb-6">
      {/* ---- Header ---- */}
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Metal Calculator
          </h1>
          <p className="text-sm text-slate-600">
            Live weight &amp; price estimation for EN profiles.{" "}
            <span className="text-xs text-slate-400">
              v{DATASET_VERSION}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            {/* rotate-ccw icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            {/* envelope icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Report
          </Link>
          {/* Mobile history toggle */}
          <button
            type="button"
            onClick={() => setShowMobileHistory((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            History
          </button>
        </div>
      </header>

      {/* ---- Disclaimer ---- */}
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
        <strong>Estimate only</strong> — verify against project specs and supplier data.
      </div>

      {/* ---- Main grid ---- */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* LEFT — inputs */}
        <div className="grid gap-0 self-start rounded-lg border border-slate-200 bg-white">
          <div className="p-4">
            <IssueList issues={issues} />
          </div>

          <div className="p-4 pt-0">
            <MaterialSection
              input={input}
              dispatch={dispatch}
              activeFamily={activeFamily}
              issues={issues}
            />
          </div>
          <div className="h-px bg-slate-100" />

          <div className="p-4">
            <ProfileSection
              input={input}
              dispatch={dispatch}
              selectedProfile={selectedProfile}
              issues={issues}
            />
          </div>
          <div className="h-px bg-slate-100" />

          <div className="p-4">
            <PricingSection
              input={input}
              dispatch={dispatch}
              issues={issues}
            />
          </div>
          <div className="h-px bg-slate-100" />

          <div className="p-4">
            <PrecisionSection input={input} dispatch={dispatch} />
          </div>

          {/* Mobile inline history (toggled) */}
          {showMobileHistory && (
            <div className="border-t border-slate-100 p-4 lg:hidden">
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
    </div>
  );
}
