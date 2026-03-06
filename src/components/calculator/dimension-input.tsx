import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { DimensionDefinition, DimensionKey } from "@/lib/datasets/types";
import { NumericInput } from "./numeric-input";

interface DimensionInputProps {
  dimension: DimensionDefinition;
  value: CalculationInput["manualDimensions"][DimensionKey];
  onValueChange: (value: number) => void;
  unit: LengthUnit;
  hasIssue?: boolean;
  issueMessage?: string;
}

export const DimensionInput = memo(function DimensionInput({
  dimension,
  value,
  onValueChange,
  unit,
  hasIssue = false,
  issueMessage,
}: DimensionInputProps) {
  const t = useTranslations();
  const dimensionLabel = t(`dataset.dimensions.${dimension.key}`);

  return (
    <div className="grid gap-1">
      <label className="truncate text-xs font-medium text-foreground-secondary" htmlFor={`dimension-${dimension.key}`}>
        {dimensionLabel}{" "}
        <span className="font-normal text-muted-faint">
          {dimension.minMm}–{dimension.maxMm}
        </span>
      </label>
      <div className="relative">
        <NumericInput
          id={`dimension-${dimension.key}`}
          name={`dimension-${dimension.key}`}
          inputMode="decimal"
          autoComplete="off"
          value={value?.value}
          onValueChange={onValueChange}
          className={`h-11 w-full rounded-lg border bg-surface px-2 pr-10 text-sm transition-colors focus:border-blue-500 ${hasIssue ? "border-red-border" : "border-border-strong"
            }`}
          aria-invalid={hasIssue}
          aria-describedby={hasIssue ? `dimension-${dimension.key}-error` : undefined}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-faint">
          {unit}
        </span>
      </div>
      {hasIssue && issueMessage && (
        <p id={`dimension-${dimension.key}-error`} className="text-[11px] text-red-interactive">
          {issueMessage}
        </p>
      )}
    </div>
  );
});
