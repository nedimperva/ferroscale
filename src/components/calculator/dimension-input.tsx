import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { DimensionDefinition, DimensionKey } from "@/lib/datasets/types";
import { NumericInput } from "./numeric-input";
import { triggerHaptic } from "@/lib/haptics";

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
          className={`h-11 w-full rounded-lg border bg-surface px-2 text-sm transition-colors focus:border-blue-500 ${hasIssue ? "border-red-border" : "border-border-strong"
            }`}
          aria-invalid={hasIssue}
          aria-describedby={hasIssue ? `dimension-${dimension.key}-error` : undefined}
        />
        <div className="relative">
          <select
            value={value?.unit ?? "mm"}
            onChange={(e) => {
              triggerHaptic("light");
              onUnitChange(e.target.value as LengthUnit);
            }}
            className="h-11 appearance-none rounded-lg border border-border-strong bg-surface pl-2 pr-7 text-sm transition-colors focus:border-blue-500"
            aria-label={t("profileSection.dimensionUnitAria", { label: dimensionLabel })}
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-faint">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {hasIssue && issueMessage && (
        <p id={`dimension-${dimension.key}-error`} className="text-[11px] text-red-interactive">
          {issueMessage}
        </p>
      )}
    </div>
  );
});
