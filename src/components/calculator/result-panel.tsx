"use client";

import { memo, useCallback, useEffect, useState } from "react";
import type { CalculationResult } from "@/lib/calculator/types";
import { ReferenceList } from "./reference-list";

interface ResultPanelProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
}

export const ResultPanel = memo(function ResultPanel({
  result,
  isPending,
  onStar,
  isStarred,
  includeVat,
  wastePercent,
  vatPercent,
}: ResultPanelProps) {
  const [showExplain, setShowExplain] = useState(false);

  /* Lock body scroll when modal is open */
  useEffect(() => {
    if (showExplain) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showExplain]);

  /* Close on Escape */
  useEffect(() => {
    if (!showExplain) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowExplain(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showExplain]);

  if (!result) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-400">Result</h2>
        <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-slate-200">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
          </svg>
          <p className="text-sm text-slate-400">
            Enter dimensions to see live results.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border bg-white transition-opacity duration-200 ${
        isPending ? "border-slate-200 opacity-60" : "border-slate-200"
      }`}
    >
      {/* ── Hero: Total Cost ── */}
      <div className="rounded-t-xl border-b border-orange-100 bg-linear-to-b from-orange-50 to-white px-5 py-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          Total Cost
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-foreground transition-all duration-300">
          {result.grandTotalAmount}
        </p>
        <p className="mt-0.5 text-sm font-medium text-muted">{result.currency}</p>
      </div>

      {/* ── Weight cards ── */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">Unit Weight</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight transition-all duration-300">
            {result.unitWeightKg}{" "}
            <span className="text-sm font-medium text-muted">kg</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">Total Weight</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight transition-all duration-300">
            {result.totalWeightKg}{" "}
            <span className="text-sm font-medium text-muted">kg</span>
          </p>
        </div>
      </div>

      {/* ── Detail rows ── */}
      <div className="mt-4 space-y-0 px-5 text-sm">
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

      {/* ── Cost Breakdown (collapsible) ── */}
      <div className="mt-1 px-5">
        <details className="group rounded-lg border border-slate-100">
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
      <div className="grid grid-cols-2 gap-3 px-5 pt-4 pb-5">
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
      <ReferenceList
        labels={result.referenceLabels}
        className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400"
      />

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
            {/* Modal header */}
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

            {/* Modal body */}
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

              {/* References inside modal */}
              <ReferenceList
                labels={result.referenceLabels}
                className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
