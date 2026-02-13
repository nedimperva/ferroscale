"use client";

import { memo, useState } from "react";
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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden">
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

        {/* Star button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className="shrink-0 rounded-full p-2 transition-colors hover:bg-slate-100"
          aria-label={isStarred ? "Remove from saved" : "Save calculation"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`h-6 w-6 transition-colors duration-200 ${
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
  );
});

/* ------------------------------------------------------------------ */
/*  Full-screen result overlay (mobile detail view)                   */
/* ------------------------------------------------------------------ */

interface ResultOverlayProps {
  result: CalculationResult;
  includeVat: boolean;
  isStarred: boolean;
  onStar: () => void;
  onClose: () => void;
}

export const ResultOverlay = memo(function ResultOverlay({
  result,
  includeVat,
  isStarred,
  onStar,
  onClose,
}: ResultOverlayProps) {
  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-white lg:hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Result Details</h2>
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
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Grand total hero */}
        <div className="mb-4 rounded-lg border border-accent/30 bg-accent-surface/50 px-4 py-3 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Grand Total
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {result.grandTotalAmount}
            <span className="ml-1.5 text-lg font-semibold text-muted">
              {result.currency}
            </span>
          </p>
          <button
            type="button"
            onClick={onStar}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs transition-colors hover:bg-slate-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-colors duration-200 ${
                isStarred ? "fill-amber-500 stroke-amber-500" : "fill-none stroke-slate-400"
              }`}
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.324L11.48 3.5z"
              />
            </svg>
            {isStarred ? "Saved" : "Save"}
          </button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
            <p className="font-medium">{result.unitWeightKg} kg</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total weight</p>
            <p className="font-medium">
              {result.totalWeightKg} kg ({result.totalWeightLb} lb)
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Unit price</p>
            <p className="font-medium">
              {result.unitPriceAmount} {result.currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Subtotal</p>
            <p className="font-medium">
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

        {/* Breakdown */}
        <details className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-2" open>
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
        <div className="mt-3 text-xs text-slate-500">
          <p className="font-medium">References</p>
          <ul className="mt-0.5 list-disc pl-4">
            {result.referenceLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});
