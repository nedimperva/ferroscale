"use client";

import { memo } from "react";
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
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
}

export const ResultPanel = memo(function ResultPanel({
  result,
  isPending,
  onStar,
  isStarred,
  includeVat,
  wastePercent,
  vatPercent,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  onAddToProject,
  hasProjects = false,
}: ResultPanelProps) {
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
      <div className="grid grid-cols-3 gap-2 px-5 pt-4 pb-5">
        <button
          type="button"
          onClick={onStar}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
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
          onClick={onCompare}
          disabled={!canCompare && !isInCompare}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
            isInCompare
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : canCompare
                ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-100 text-slate-300"
          }`}
          title={isInCompare ? "Already in compare" : canCompare ? "Add to compare" : "Compare full (3/3)"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
          {isInCompare ? `${compareCount}/3` : "Compare"}
        </button>
        <button
          type="button"
          onClick={onAddToProject}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
            hasProjects
              ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
          title="Add to project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>
          </svg>
          Project
        </button>
      </div>

      {/* ── Full calculation steps (inline collapsible) ── */}
      <details className="border-t border-slate-100 px-5 py-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 select-none">
          Full calculation steps
        </summary>
        <div className="mt-2 overflow-x-auto">
          <p className="mb-2 text-xs text-slate-500">
            Formula: {result.formulaLabel}
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500">
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
        className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400"
      />
    </section>
  );
});
