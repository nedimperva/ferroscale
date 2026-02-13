"use client";

import { memo, useCallback } from "react";
import type { CalculationResult } from "@/lib/calculator/types";
import { downloadCsv } from "@/lib/calculator/csv";

interface ResultPanelProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  includeVat: boolean;
}

export const ResultPanel = memo(function ResultPanel({
  result,
  isPending,
  onStar,
  isStarred,
  includeVat,
}: ResultPanelProps) {
  const handleExport = useCallback(() => {
    if (result) downloadCsv(result);
  }, [result]);

  if (!result) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-500">Result</h2>
        <p className="mt-2 text-sm text-slate-400">
          Change any input to see live results.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-lg border bg-white p-4 transition-opacity duration-200 ${
        isPending ? "border-slate-200 opacity-60" : "border-slate-300"
      }`}
    >
      {/* Grand Total — visual hero */}
      <div className="mb-3 rounded-lg border border-accent/30 bg-accent-surface/50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Grand Total
            </p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-foreground transition-all duration-300 lg:text-4xl">
              {result.grandTotalAmount}
              <span className="ml-1.5 text-lg font-semibold text-muted">
                {result.currency}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onStar}
            className="mt-1 shrink-0 rounded-md p-1.5 transition-colors duration-200 hover:bg-slate-100"
            aria-label={isStarred ? "Remove from saved" : "Save calculation"}
            title={isStarred ? "Remove from saved" : "Save calculation"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={`h-5 w-5 transition-colors duration-200 ${
                isStarred
                  ? "fill-amber-500 stroke-amber-500"
                  : "fill-none stroke-slate-400"
              }`}
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.324L11.48 3.5z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-slate-500">Profile</p>
          <p className="font-medium">{result.profileLabel}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Material</p>
          <p className="font-medium">{result.gradeLabel}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Unit weight</p>
          <p className="font-medium transition-all duration-300">{result.unitWeightKg} kg</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Total weight</p>
          <p className="font-medium transition-all duration-300">
            {result.totalWeightKg} kg
            <span className="text-xs text-slate-500 ml-1">({result.totalWeightLb} lb)</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Unit price</p>
          <p className="font-medium transition-all duration-300">
            {result.unitPriceAmount} {result.currency}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Subtotal</p>
          <p className="font-medium transition-all duration-300">
            {result.subtotalAmount} {result.currency}
          </p>
        </div>
        {result.wasteAmount > 0 && (
          <div>
            <p className="text-xs text-slate-500">Waste</p>
            <p className="font-medium">
              {result.wasteAmount} {result.currency}
            </p>
          </div>
        )}
        {includeVat && (
          <div>
            <p className="text-xs text-slate-500">VAT</p>
            <p className="font-medium">
              {result.vatAmount} {result.currency}
            </p>
          </div>
        )}
      </div>

      {/* Formula + export */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <p className="text-xs text-slate-500">
          Formula: {result.formulaLabel}
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50"
        >
          CSV
        </button>
      </div>

      {/* Breakdown */}
      <details className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-700">
          Calculation breakdown
        </summary>
        <div className="mt-2 overflow-x-auto">
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
                  <td className="py-1">
                    {row.value} {row.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* References */}
      <div className="mt-2 text-xs text-slate-500">
        <p className="font-medium">References</p>
        <ul className="mt-0.5 list-disc pl-4">
          {result.referenceLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
    </section>
  );
});
