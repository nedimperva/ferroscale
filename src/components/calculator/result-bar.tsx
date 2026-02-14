"use client";

import { memo, useEffect } from "react";
import type { CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { ReferenceList } from "./reference-list";

interface ResultBarProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  onExpand: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  onAddToProject?: () => void;
  hasProjects?: boolean;
}

/**
 * Mobile sticky bottom bar — shows the grand total at a glance.
 * Tapping it opens the full result panel via the onExpand callback.
 * Hidden on desktop (xl:hidden).
 */
export const ResultBar = memo(function ResultBar({
  result,
  isPending,
  onStar,
  isStarred,
  onExpand,
  onCompare,
  canCompare = false,
  isInCompare = false,
  onAddToProject,
  hasProjects = false,
}: ResultBarProps) {
  if (!result) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-sm xl:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
        {/* Tappable main area */}
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 flex-col text-left"
        >
          <span className="truncate text-xs text-muted">
            {result.profileLabel} · {result.gradeLabel}
          </span>
          <span
            className={`text-2xl font-bold tracking-tight transition-opacity duration-200 ${
              isPending ? "opacity-50" : ""
            }`}
          >
            {result.grandTotalAmount}
            <span className="ml-1 text-sm font-semibold text-muted">
              {CURRENCY_SYMBOLS[result.currency]}
            </span>
          </span>
          <span className="text-xs text-muted">
            {result.totalWeightKg} kg · Tap for details
          </span>
        </button>

        {/* Compare button */}
        {(canCompare || isInCompare) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCompare?.();
            }}
            className={`shrink-0 rounded-full p-2 transition-colors ${
              isInCompare ? "bg-blue-surface" : "hover:bg-surface-inset"
            }`}
            aria-label={isInCompare ? "Already in compare" : "Add to compare"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-6 w-6 transition-colors duration-200 ${
                isInCompare ? "stroke-blue-text" : "stroke-muted-faint"
              }`}
            >
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          </button>
        )}

        {/* Project button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToProject?.();
          }}
          className={`shrink-0 rounded-full p-2 transition-colors ${
            hasProjects ? "bg-purple-surface" : "hover:bg-surface-inset"
          }`}
          aria-label="Add to project"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-6 w-6 transition-colors duration-200 ${
              hasProjects ? "stroke-purple-text" : "stroke-muted-faint"
            }`}
          >
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
          </svg>
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className={`shrink-0 rounded-full p-2 transition-colors ${
            isStarred ? "bg-accent-surface" : "hover:bg-surface-inset"
          }`}
          aria-label={isStarred ? "Remove from saved" : "Save calculation"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`h-6 w-6 transition-colors duration-200 ${
              isStarred
                ? "fill-accent stroke-accent"
                : "fill-none stroke-muted-faint"
            }`}
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Full-screen result overlay (mobile detail view)                   */
/* ------------------------------------------------------------------ */

interface ResultOverlayProps {
  result: CalculationResult;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  isStarred: boolean;
  onStar: () => void;
  onClose: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
}

export const ResultOverlay = memo(function ResultOverlay({
  result,
  includeVat,
  wastePercent,
  vatPercent,
  isStarred,
  onStar,
  onClose,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  onAddToProject,
  hasProjects = false,
}: ResultOverlayProps) {
  /* Lock body scroll when overlay is open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-surface xl:hidden" style={{ overscrollBehavior: "contain" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Result</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted hover:bg-surface-inset"
          aria-label="Close details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Hero: Total Cost ── */}
        <div className="border-b border-accent-border bg-linear-to-b from-accent-surface to-surface px-5 py-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Total Cost
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">
            {result.grandTotalAmount}
          </p>
          <p className="mt-0.5 text-sm font-medium text-muted">{CURRENCY_SYMBOLS[result.currency]}</p>
        </div>

        <div className="px-4 py-4">
          {/* ── Weight cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-raised px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted">Unit Weight</p>
              <p className="mt-0.5 text-lg font-bold tracking-tight">
                {result.unitWeightKg}{" "}
                <span className="text-sm font-medium text-muted">kg</span>
              </p>
            </div>
            <div className="rounded-lg bg-surface-raised px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted">Total Weight</p>
              <p className="mt-0.5 text-lg font-bold tracking-tight">
                {result.totalWeightKg}{" "}
                <span className="text-sm font-medium text-muted">kg</span>
              </p>
            </div>
          </div>

          {/* ── Detail rows ── */}
          <div className="mt-4 space-y-0 text-sm">
            <div className="flex items-baseline justify-between border-b border-border-faint py-2">
              <span className="text-muted">Profile:</span>
              <span className="font-medium text-right">{result.profileLabel}</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-border-faint py-2">
              <span className="text-muted">Material:</span>
              <span className="font-medium text-right">{result.gradeLabel}</span>
            </div>
            <div className="flex items-baseline justify-between py-2">
              <span className="text-muted">Unit Price:</span>
              <span className="font-medium text-right">
                {result.unitPriceAmount} {CURRENCY_SYMBOLS[result.currency]}/{result.priceUnit ?? "kg"}
              </span>
            </div>
          </div>

          {/* ── Cost Breakdown ── */}
          <div className="mt-3">
            <details className="group rounded-lg border border-border-faint" open>
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground-secondary select-none">
                Cost Breakdown
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted-faint transition-transform group-open:rotate-180">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="border-t border-border-faint px-3 py-2.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted">Subtotal:</span>
                  <span>{result.subtotalAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
                </div>
                {result.wasteAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted">
                      Waste ({wastePercent}%):
                    </span>
                    <span>{result.wasteAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
                  </div>
                )}
                {includeVat && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted">
                      VAT ({vatPercent}%):
                    </span>
                    <span>{result.vatAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total:</span>
                  <span className="text-accent">{result.grandTotalAmount} {CURRENCY_SYMBOLS[result.currency]}</span>
                </div>
              </div>
            </details>
          </div>

          {/* ── Action buttons ── */}
          <div className="mt-4 flex flex-col gap-2">
            {/* Compare — full width, primary action */}
            <button
              type="button"
              onClick={onCompare}
              disabled={!canCompare && !isInCompare}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                isInCompare
                  ? "border-blue-border bg-blue-surface text-blue-text"
                  : canCompare
                    ? "border-border text-foreground-secondary hover:bg-surface-raised"
                    : "cursor-not-allowed border-border-faint text-muted-faint"
              }`}
              title={isInCompare ? "Already in compare" : canCompare ? "Add to compare" : "Compare full (3/3)"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
              {isInCompare ? `In Compare (${compareCount}/3)` : "Add to Compare"}
            </button>

            {/* Save + Project — side by side */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onStar}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  isStarred
                    ? "border-accent-border bg-accent-surface text-accent"
                    : "border-border text-foreground-secondary hover:bg-surface-raised"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 ${
                    isStarred ? "fill-accent stroke-accent" : "fill-none stroke-current"
                  }`}
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isStarred ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                onClick={onAddToProject}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  hasProjects
                    ? "border-purple-border bg-purple-surface text-purple-text hover:bg-purple-surface"
                    : "border-border text-foreground-secondary hover:bg-surface-raised"
                }`}
                title="Add to project"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
                </svg>
                Project
              </button>
            </div>
          </div>

          {/* ── Full calculation steps (inline collapsible) ── */}
          <details className="mt-4 border-t border-border-faint pt-3">
            <summary className="cursor-pointer text-xs font-medium text-muted select-none">
              Full calculation steps
            </summary>
            <div className="mt-2 overflow-x-auto">
              <p className="mb-2 text-xs text-muted">
                Formula: {result.formulaLabel}
              </p>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1">Step</th>
                    <th className="py-1">Expression</th>
                    <th className="py-1">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdownRows.map((row) => (
                    <tr key={`${row.label}-${row.expression}`}>
                      <td className="py-1 pr-2">{row.label}</td>
                      <td className="py-1 pr-2 font-mono text-[11px]">{row.expression}</td>
                      <td className="py-1">{row.value} {row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* ── References ── */}
          <ReferenceList
            labels={result.referenceLabels}
            className="mt-3 text-xs text-muted-faint"
          />
        </div>
      </div>
    </div>
  );
});
