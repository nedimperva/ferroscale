import { memo } from "react";
import type { CalculationInput } from "@/lib/calculator/types";
import { getMaterialGradeById } from "@/lib/datasets/materials";

interface SettingsSummaryProps {
  input: CalculationInput;
  onOpen: () => void;
}

export const SettingsSummary = memo(function SettingsSummary({
  input,
  onOpen,
}: SettingsSummaryProps) {
  const grade = getMaterialGradeById(input.materialGradeId);
  const gradeLabel = grade?.label ?? input.materialGradeId;
  const density = input.useCustomDensity
    ? `${input.customDensityKgPerM3 ?? "?"} kg/m³`
    : null;

  const priceTag = `${input.unitPrice} ${input.currency}/${input.priceUnit}`;
  const wasteTag = input.wastePercent > 0 ? `+${input.wastePercent}% waste` : null;
  const vatTag = input.includeVat ? `VAT ${input.vatPercent}%` : null;
  const roundTag = `${input.rounding.weightDecimals}/${input.rounding.priceDecimals}/${input.rounding.dimensionDecimals}`;

  const parts = [
    gradeLabel,
    density,
    priceTag,
    wasteTag,
    vatTag,
    roundTag,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      {/* gear icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="truncate text-xs text-slate-500">
        {parts.join(" · ")}
      </span>
      <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-400 transition-colors group-hover:text-slate-600">
        Edit
      </span>
    </button>
  );
});
