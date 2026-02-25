"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { UseReverseReturn } from "@/hooks/useReverseCalculator";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import { fromMillimeters, roundTo } from "@/lib/calculator/units";
import type { DimensionKey } from "@/lib/datasets/types";
import type { QuantityResponse } from "@/lib/calculator/reverse";
import { NumericInput } from "./numeric-input";

interface ReversePanelProps {
  reverse: UseReverseReturn;
  /** Whether the current profile supports dimension-solve mode (manual only). */
  isManualProfile: boolean;
  input: CalculationInput;
}

export const ReversePanel = memo(function ReversePanel({
  reverse,
  isManualProfile,
  input,
}: ReversePanelProps) {
  const t = useTranslations("reverse");
  const tBase = useTranslations();

  return (
    <section className="border-t border-border bg-surface md:rounded-lg md:border">
      {/* Toggle header */}
      <button
        type="button"
        onClick={reverse.toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {/* reverse/swap icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="m7.5 4.21 4.5 2.6 4.5-2.6" />
            <path d="M7.5 19.79V14.6L3 12" />
            <path d="M21 12l-4.5 2.6v5.19" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
          </svg>
          <span className="text-sm font-semibold text-foreground-secondary">{t("title")}</span>
        </div>
        <div
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${reverse.enabled ? "bg-blue-strong" : "bg-border-strong"
            }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${reverse.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
          />
        </div>
      </button>

      {/* Body — visible only when enabled */}
      {reverse.enabled && (
        <div className="border-t border-border-faint px-4 py-3 space-y-3">

          {/* Mode toggle */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => reverse.setReverseMode("dimension")}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${reverse.reverseMode === "dimension"
                ? "border-blue-500 bg-blue-surface text-blue-text shadow-sm"
                : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-raised"
                }`}
            >
              {t("modeDimension")}
            </button>
            <button
              type="button"
              onClick={() => reverse.setReverseMode("quantity")}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${reverse.reverseMode === "quantity"
                ? "border-blue-500 bg-blue-surface text-blue-text shadow-sm"
                : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-raised"
                }`}
            >
              {t("modeQuantity")}
            </button>
          </div>

          {/* ── Dimension mode ── */}
          {reverse.reverseMode === "dimension" && (
            <>
              {!isManualProfile ? (
                <div className="rounded-lg border border-amber-200 bg-amber-surface px-3 py-2 text-xs text-amber-text">
                  {t("unavailable")} {t("unavailableHint")}
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted">
                    {t("description")}
                  </p>

                  {/* Target weight input */}
                  <div className="grid gap-1">
                    <label htmlFor="reverse-weight" className="text-xs font-medium text-foreground-secondary">
                      {t("targetWeight")}
                    </label>
                    <div className="flex gap-1">
                      <NumericInput
                        id="reverse-weight"
                        inputMode="decimal"
                        autoComplete="off"
                        value={reverse.targetWeightKg}
                        onValueChange={reverse.setTargetWeight}
                        className="h-10 w-full rounded-lg border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
                      />
                      <span className="flex h-10 items-center rounded-lg border border-border-strong bg-surface-raised px-2 text-xs font-medium text-muted">
                        kg
                      </span>
                    </div>
                  </div>

                  {/* Dimension to solve for */}
                  {reverse.solvableOptions.length > 1 && (
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-foreground-secondary">{t("solveFor")}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {reverse.solvableOptions.map((dim) => (
                          <button
                            key={dim}
                            type="button"
                            onClick={() => reverse.setSolveDimension(dim)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${reverse.solveDimension === dim
                              ? "border-blue-500 bg-blue-surface text-blue-text shadow-sm"
                              : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-raised"
                              }`}
                          >
                            {tBase(`dataset.dimensions.${dim}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dimension result */}
                  <ReverseResult
                    result={reverse.result}
                    solveDimension={reverse.solveDimension}
                    input={input}
                    dimensionDecimals={input.rounding.dimensionDecimals}
                  />
                </>
              )}
            </>
          )}

          {/* ── Quantity mode ── */}
          {reverse.reverseMode === "quantity" && (
            <>
              <p className="text-xs text-muted">
                {t("quantityDescription")}
              </p>

              {/* Target weight input */}
              <div className="grid gap-1">
                <label htmlFor="reverse-weight-qty" className="text-xs font-medium text-foreground-secondary">
                  {t("targetWeight")}
                </label>
                <div className="flex gap-1">
                  <NumericInput
                    id="reverse-weight-qty"
                    inputMode="decimal"
                    autoComplete="off"
                    value={reverse.targetWeightKg}
                    onValueChange={reverse.setTargetWeight}
                    className="h-10 w-full rounded-lg border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
                  />
                  <span className="flex h-10 items-center rounded-lg border border-border-strong bg-surface-raised px-2 text-xs font-medium text-muted">
                    kg
                  </span>
                </div>
              </div>

              {/* Quantity result */}
              <QuantityResultPanel
                result={reverse.quantityResult}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
});

/* ------------------------------------------------------------------ */

function ReverseResult({
  result,
  solveDimension,
  input,
  dimensionDecimals,
}: {
  result: UseReverseReturn["result"];
  solveDimension: DimensionKey | null;
  input: CalculationInput;
  dimensionDecimals: number;
}) {
  const t = useTranslations();

  if (!result) return null;

  if (!result.ok) {
    const values = result.messageValues;
    const resolvedValues = values && typeof values.dimension === "string"
      ? { ...values, dimension: t(`dataset.dimensions.${values.dimension}`) }
      : values;

    return (
      <div className="rounded-lg border border-red-border bg-red-surface px-3 py-2.5 text-xs text-red-text">
        {result.messageKey
          ? t(result.messageKey, resolvedValues as Record<string, string | number>)
          : result.message}
      </div>
    );
  }

  const label = solveDimension ? t(`dataset.dimensions.${solveDimension}`) : t("precision.dimension");
  const unit: LengthUnit = solveDimension
    ? (input.manualDimensions[solveDimension]?.unit ?? "mm")
    : "mm";
  const displayValue = roundTo(fromMillimeters(result.valueMm, unit), dimensionDecimals);

  return (
    <div className="rounded-lg border border-green-border bg-green-surface px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-green-text">
        {t("reverse.required", { label })}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-green-900">
        {displayValue}
        <span className="ml-1 text-sm font-medium text-green-600">{unit}</span>
      </p>
      <p className="mt-1 text-[11px] text-green-600">
        {t("reverse.equivalent", { value: result.valueMm.toFixed(2) })}
      </p>
      <p className="mt-0.5 text-[11px] text-green-600">
        {t("reverse.requiredArea", { value: result.requiredAreaMm2.toFixed(2) })}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuantityResultPanel({
  result,
}: {
  result: QuantityResponse | null;
}) {
  const t = useTranslations("reverse");
  const tRoot = useTranslations();

  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-border bg-red-surface px-3 py-2.5 text-xs text-red-text">
        {result.messageKey
          ? tRoot(result.messageKey as Parameters<typeof tRoot>[0])
          : result.message}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-border bg-green-surface px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-green-text">
        {t("quantityResult")}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-green-900">
        {t("pieces", { count: result.wholeQuantity })}
      </p>
      <p className="mt-1 text-[11px] text-green-600">
        {t("piecesExact", { value: result.exactQuantity.toFixed(3) })}
      </p>
      <p className="mt-0.5 text-[11px] text-green-600">
        {t("weightPerPiece", { value: result.unitWeightKg.toFixed(3) })}
      </p>
      <p className="mt-0.5 text-[11px] text-green-600">
        {t("remainder", { value: result.remainderKg.toFixed(3) })}
      </p>
    </div>
  );
}
