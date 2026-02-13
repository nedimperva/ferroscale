"use client";

import { memo, useState, useEffect } from "react";
import type { CalculationResult } from "@/lib/calculator/types";

interface ResultBarProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  onExpand: () => void;
}

/**
 * Mobile sticky bottom bar — shows the grand total at a glance.
 * Tapping it opens the full result panel via the onExpand callback.
 * Hidden on desktop (lg:hidden).
 */
export const ResultBar = memo(function ResultBar({
  result,
  isPending,
  onStar,
  isStarred,
  onExpand,
}: ResultBarProps) {
  if (!result) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
        {/* Tappable main area */}
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 flex-col text-left"
        >
          <span className="truncate text-xs text-slate-500">
            {result.profileLabel} · {result.gradeLabel}
          </span>
          <span
            className={`text-2xl font-bold tracking-tight transition-opacity duration-200 ${
              isPending ? "opacity-50" : ""
            }`}
          >
            {result.grandTotalAmount}
            <span className="ml-1 text-sm font-semibold text-muted">
              {result.currency}
            </span>
          </span>
          <span className="text-xs text-slate-500">
            {result.totalWeightKg} kg · Tap for details
          </span>
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className={`shrink-0 rounded-full p-2 transition-colors ${
            isStarred ? "bg-orange-50" : "hover:bg-slate-100"
          }`}
          aria-label={isStarred ? "Remove from saved" : "Save calculation"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`h-6 w-6 transition-colors duration-200 ${
              isStarred
                ? "fill-accent stroke-accent"
                : "fill-none stroke-slate-400"
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
}

export const ResultOverlay = memo(function ResultOverlay({
  result,
  includeVat,
  wastePercent,
  vatPercent,
  isStarred,
  onStar,
  onClose,
}: ResultOverlayProps) {
  const [showExplain, setShowExplain] = useState(false);

  /* Lock body scroll when overlay is open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-white lg:hidden" style={{ overscrollBehavior: "contain" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Result</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
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
        <div className="border-b border-orange-100 bg-linear-to-b from-orange-50 to-white px-5 py-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Total Cost
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground">
            {result.grandTotalAmount}
          </p>
          <p className="mt-0.5 text-sm font-medium text-muted">{result.currency}</p>
        </div>

        <div className="px-4 py-4">
          {/* ── Weight cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-medium text-slate-500">Unit Weight</p>
              <p className="mt-0.5 text-lg font-bold tracking-tight">
                {result.unitWeightKg}{" "}
                <span className="text-sm font-medium text-muted">kg</span>
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-medium text-slate-500">Total Weight</p>
              <p className="mt-0.5 text-lg font-bold tracking-tight">
                {result.totalWeightKg}{" "}
                <span className="text-sm font-medium text-muted">kg</span>
              </p>
            </div>
          </div>

          {/* ── Detail rows ── */}
          <div className="mt-4 space-y-0 text-sm">
            <div className="flex items-baseline justify-between border-b border-slate-100 py-2">
              <span className="text-slate-500">Profile:</span>
              <span className="font-medium text-right">{result.profileLabel}</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-slate-100 py-2">
              <span className="text-slate-500">Material:</span>
              <span className="font-medium text-right">{result.gradeLabel}</span>
            </div>
            <div className="flex items-baseline justify-between py-2">
              <span className="text-slate-500">Unit Price:</span>
              <span className="font-medium text-right">
                {result.unitPriceAmount} {result.currency}/{result.priceUnit ?? "kg"}
              </span>
            </div>
          </div>

          {/* ── Cost Breakdown ── */}
          <div className="mt-3">
            <details className="group rounded-lg border border-slate-100" open>
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 select-none">
                Cost Breakdown
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 px-3 py-2.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Subtotal:</span>
                  <span>{result.subtotalAmount} {result.currency}</span>
                </div>
                {result.wasteAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">
                      Waste ({wastePercent}%):
                    </span>
                    <span>{result.wasteAmount} {result.currency}</span>
                  </div>
                )}
                {includeVat && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">
                      VAT ({vatPercent}%):
                    </span>
                    <span>{result.vatAmount} {result.currency}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold">
                  <span>Total:</span>
                  <span className="text-accent">{result.grandTotalAmount} {result.currency}</span>
                </div>
              </div>
            </details>
          </div>

          {/* ── Action buttons ── */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onStar}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                isStarred
                  ? "border-orange-200 bg-orange-50 text-accent"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
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
              onClick={() => setShowExplain(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Explain
            </button>
          </div>

          {/* ── References ── */}
          <div className="mt-3 text-xs text-slate-400">
            <p className="font-medium text-slate-500">References</p>
            <ul className="mt-0.5 list-disc pl-4">
              {result.referenceLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Explain modal ── */}
      {showExplain && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowExplain(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold">Calculation Steps</h3>
              <button
                type="button"
                onClick={() => setShowExplain(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(85vh - 56px)" }}>
              <p className="mb-3 text-xs text-slate-500">
                Formula: {result.formulaLabel}
              </p>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 pr-3">Step</th>
                    <th className="pb-2 pr-3">Expression</th>
                    <th className="pb-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdownRows.map((row) => (
                    <tr key={`${row.label}-${row.expression}`} className="border-b border-slate-50">
                      <td className="py-2 pr-3 text-slate-600">{row.label}</td>
                      <td className="py-2 pr-3 font-mono text-[11px]">{row.expression}</td>
                      <td className="py-2 font-medium">
                        {row.value} {row.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                <p className="font-medium text-slate-500">References</p>
                <ul className="mt-1 list-disc pl-4">
                  {result.referenceLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
