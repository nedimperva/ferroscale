"use client";

import { memo } from "react";
import type { UseReverseReturn } from "@/hooks/useReverseCalculator";
import type { DimensionKey } from "@/lib/datasets/types";

interface ReversePanelProps {
  reverse: UseReverseReturn;
  /** Whether the current profile supports reverse mode (manual only). */
  isManualProfile: boolean;
}

export const ReversePanel = memo(function ReversePanel({
  reverse,
  isManualProfile,
}: ReversePanelProps) {
  if (!isManualProfile) {
    if (reverse.enabled) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Reverse mode is only available for manual-dimension profiles (bars, tubes, plates).
          Standard EN profiles have fixed sizes.
        </div>
      );
    }
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {/* Toggle header */}
      <button
        type="button"
        onClick={reverse.toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {/* reverse/swap icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-500">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <path d="m7.5 4.21 4.5 2.6 4.5-2.6"/>
            <path d="M7.5 19.79V14.6L3 12"/>
            <path d="M21 12l-4.5 2.6v5.19"/>
            <path d="M3.27 6.96 12 12.01l8.73-5.05"/>
            <path d="M12 22.08V12"/>
          </svg>
          <span className="text-sm font-semibold text-slate-700">Reverse Calculator</span>
        </div>
        <div
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            reverse.enabled ? "bg-blue-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
              reverse.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </div>
      </button>

      {/* Body — visible only when enabled */}
      {reverse.enabled && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <p className="text-xs text-slate-500">
            Enter a target weight and choose which dimension to solve for.
            Other dimensions and settings are taken from the main calculator.
          </p>

          {/* Target weight input */}
          <div className="grid gap-1">
            <label htmlFor="reverse-weight" className="text-xs font-medium text-slate-600">
              Target total weight
            </label>
            <div className="flex gap-1">
              <input
                id="reverse-weight"
                type="number"
                inputMode="decimal"
                autoComplete="off"
                min={0}
                step="any"
                value={reverse.targetWeightKg}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) reverse.setTargetWeight(v);
                }}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm transition-colors focus:border-blue-500"
              />
              <span className="flex h-9 items-center rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-500">
                kg
              </span>
            </div>
          </div>

          {/* Dimension to solve for */}
          {reverse.solvableOptions.length > 1 && (
            <div className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">Solve for</span>
              <div className="flex flex-wrap gap-1.5">
                {reverse.solvableOptions.map((dim) => (
                  <button
                    key={dim}
                    type="button"
                    onClick={() => reverse.setSolveDimension(dim)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      reverse.solveDimension === dim
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {reverse.dimensionLabels[dim] ?? dim}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          <ReverseResult
            result={reverse.result}
            solveDimension={reverse.solveDimension}
            dimensionLabels={reverse.dimensionLabels}
          />
        </div>
      )}
    </section>
  );
});

/* ------------------------------------------------------------------ */

function ReverseResult({
  result,
  solveDimension,
  dimensionLabels,
}: {
  result: UseReverseReturn["result"];
  solveDimension: DimensionKey | null;
  dimensionLabels: Record<string, string>;
}) {
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
        {result.message}
      </div>
    );
  }

  const label = solveDimension ? (dimensionLabels[solveDimension] ?? solveDimension) : "Dimension";
  /* Determine the display unit from the solved dimension key */
  const unit = "mm"; /* The valueMm was already converted in the hook */

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-green-700">
        Required {label}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-green-900">
        {result.valueMm}
        <span className="ml-1 text-sm font-medium text-green-600">{unit}</span>
      </p>
      <p className="mt-1 text-[11px] text-green-600">
        Cross-section area needed: {result.requiredAreaMm2.toFixed(2)} mm²
      </p>
    </div>
  );
}
