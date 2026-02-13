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
      <label className="text-xs font-medium text-slate-700" htmlFor={`dimension-${dimension.key}`}>
        {dimension.label}{" "}
        <span className="font-normal text-slate-400">
          {dimension.minMm}–{dimension.maxMm} mm
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
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
        />
        <select
          value={value?.unit ?? "mm"}
          onChange={(e) => onUnitChange(e.target.value as LengthUnit)}
          className="h-9 rounded-md border border-slate-300 bg-white px-1 text-sm"
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
