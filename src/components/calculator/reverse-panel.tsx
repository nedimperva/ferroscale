"use client";

import { memo } from "react";
import type { UseReverseReturn } from "@/hooks/useReverseCalculator";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import { fromMillimeters, roundTo } from "@/lib/calculator/units";
import type { DimensionKey } from "@/lib/datasets/types";
import { NumericInput } from "./numeric-input";

interface ReversePanelProps {
  reverse: UseReverseReturn;
  /** Whether the current profile supports reverse mode (manual only). */
  isManualProfile: boolean;
  input: CalculationInput;
}

export const ReversePanel = memo(function ReversePanel({
  reverse,
  isManualProfile,
  input,
}: ReversePanelProps) {
  if (!isManualProfile) {
    if (reverse.enabled) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-surface px-3 py-2 text-xs text-amber-text">
          Reverse mode is only available for manual-dimension profiles (bars, tubes, plates).
          Standard EN profiles have fixed sizes.
        </div>
      );
    }
    return null;
  }

  return (
    <section className="rounded-lg border border-border bg-surface">
      {/* Toggle header */}
      <button
        type="button"
        onClick={reverse.toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {/* reverse/swap icon */}
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <path d="m7.5 4.21 4.5 2.6 4.5-2.6"/>
            <path d="M7.5 19.79V14.6L3 12"/>
            <path d="M21 12l-4.5 2.6v5.19"/>
            <path d="M3.27 6.96 12 12.01l8.73-5.05"/>
            <path d="M12 22.08V12"/>
          </svg>
          <span className="text-sm font-semibold text-foreground-secondary">Reverse Calculator</span>
        </div>
        <div
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            reverse.enabled ? "bg-blue-strong" : "bg-border-strong"
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
        <div className="border-t border-border-faint px-4 py-3 space-y-3">
          <p className="text-xs text-muted">
            Enter a target weight and choose which dimension to solve for.
            Other dimensions and settings are taken from the main calculator.
          </p>

          {/* Target weight input */}
          <div className="grid gap-1">
            <label htmlFor="reverse-weight" className="text-xs font-medium text-foreground-secondary">
              Target total weight
            </label>
            <div className="flex gap-1">
              <NumericInput
                id="reverse-weight"
                inputMode="decimal"
                autoComplete="off"
                value={reverse.targetWeightKg}
                onValueChange={reverse.setTargetWeight}
                className="h-9 w-full rounded-lg border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
              />
              <span className="flex h-9 items-center rounded-lg border border-border-strong bg-surface-raised px-2 text-xs font-medium text-muted">
                kg
              </span>
            </div>
          </div>

          {/* Dimension to solve for */}
          {reverse.solvableOptions.length > 1 && (
            <div className="grid gap-1">
              <span className="text-xs font-medium text-foreground-secondary">Solve for</span>
              <div className="flex flex-wrap gap-1.5">
                {reverse.solvableOptions.map((dim) => (
                  <button
                    key={dim}
                    type="button"
                    onClick={() => reverse.setSolveDimension(dim)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      reverse.solveDimension === dim
                        ? "border-blue-500 bg-blue-surface text-blue-text shadow-sm"
                        : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-raised"
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
            input={input}
            dimensionDecimals={input.rounding.dimensionDecimals}
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
  input,
  dimensionDecimals,
}: {
  result: UseReverseReturn["result"];
  solveDimension: DimensionKey | null;
  dimensionLabels: Record<string, string>;
  input: CalculationInput;
  dimensionDecimals: number;
}) {
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-border bg-red-surface px-3 py-2.5 text-xs text-red-text">
        {result.message}
      </div>
    );
  }

  const label = solveDimension ? (dimensionLabels[solveDimension] ?? solveDimension) : "Dimension";
  const unit: LengthUnit = solveDimension
    ? (input.manualDimensions[solveDimension]?.unit ?? "mm")
    : "mm";
  const displayValue = roundTo(fromMillimeters(result.valueMm, unit), dimensionDecimals);

  return (
    <div className="rounded-lg border border-green-border bg-green-surface px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-green-text">
        Required {label}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-green-900">
        {displayValue}
        <span className="ml-1 text-sm font-medium text-green-600">{unit}</span>
      </p>
      <p className="mt-1 text-[11px] text-green-600">
        Equivalent: {result.valueMm.toFixed(2)} mm
      </p>
      <p className="mt-0.5 text-[11px] text-green-600">
        Cross-section area needed: {result.requiredAreaMm2.toFixed(2)} mm²
      </p>
    </div>
  );
}
