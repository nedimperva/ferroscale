import { memo } from "react";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { DimensionDefinition, DimensionKey } from "@/lib/datasets/types";
import { parseNumber } from "@/hooks/useCalculator";

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

interface DimensionInputProps {
  dimension: DimensionDefinition;
  value: CalculationInput["manualDimensions"][DimensionKey];
  onValueChange: (value: number) => void;
  onUnitChange: (unit: LengthUnit) => void;
}

export const DimensionInput = memo(function DimensionInput({
  dimension,
  value,
  onValueChange,
  onUnitChange,
}: DimensionInputProps) {
  return (
    <div className="grid gap-1">
      <label className="truncate text-xs font-medium text-foreground-secondary" htmlFor={`dimension-${dimension.key}`}>
        {dimension.label}{" "}
        <span className="font-normal text-muted-faint">
          {dimension.minMm}–{dimension.maxMm}
        </span>
      </label>
      <div className="flex gap-1">
        <input
          id={`dimension-${dimension.key}`}
          name={`dimension-${dimension.key}`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min={0}
          step="any"
          value={value?.value ?? ""}
          onChange={(e) => onValueChange(parseNumber(e.target.value))}
          className="h-9 w-full rounded-lg border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-accent"
        />
        <select
          value={value?.unit ?? "mm"}
          onChange={(e) => onUnitChange(e.target.value as LengthUnit)}
          className="h-9 rounded-lg border border-border-strong bg-surface px-1 text-sm transition-colors focus:border-accent"
          aria-label={`${dimension.label} unit`}
        >
          {LENGTH_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});
