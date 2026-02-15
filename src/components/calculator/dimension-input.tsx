import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { DimensionDefinition, DimensionKey } from "@/lib/datasets/types";
import { NumericInput } from "./numeric-input";

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

interface DimensionInputProps {
  dimension: DimensionDefinition;
  value: CalculationInput["manualDimensions"][DimensionKey];
  onValueChange: (value: number) => void;
  onUnitChange: (unit: LengthUnit) => void;
  hasIssue?: boolean;
  issueMessage?: string;
}

export const DimensionInput = memo(function DimensionInput({
  dimension,
  value,
  onValueChange,
  onUnitChange,
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
      <div className="flex gap-1">
        <NumericInput
          id={`dimension-${dimension.key}`}
          name={`dimension-${dimension.key}`}
          inputMode="decimal"
          autoComplete="off"
          value={value?.value}
          onValueChange={onValueChange}
          className={`h-9 w-full rounded-lg border bg-surface px-2 text-sm transition-colors focus:border-accent ${
            hasIssue ? "border-red-border" : "border-border-strong"
          }`}
          aria-invalid={hasIssue}
          aria-describedby={hasIssue ? `dimension-${dimension.key}-error` : undefined}
        />
        <select
          value={value?.unit ?? "mm"}
          onChange={(e) => onUnitChange(e.target.value as LengthUnit)}
          className="h-9 rounded-lg border border-border-strong bg-surface px-1 text-sm transition-colors focus:border-accent"
          aria-label={t("profileSection.dimensionUnitAria", { label: dimensionLabel })}
        >
          {LENGTH_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      {hasIssue && issueMessage && (
        <p id={`dimension-${dimension.key}-error`} className="text-[11px] text-red-interactive">
          {issueMessage}
        </p>
      )}
    </div>
  );
});
