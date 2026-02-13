import { memo } from "react";
import type { CalculationInput, ValidationIssue } from "@/lib/calculator/types";
import { METAL_FAMILIES, getMaterialGradesByFamily } from "@/lib/datasets/materials";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { parseNumber } from "@/hooks/useCalculator";

interface MaterialSectionProps {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  activeFamily: MetalFamilyId;
  issues: ValidationIssue[];
}

export const MaterialSection = memo(function MaterialSection({
  input,
  dispatch,
  activeFamily,
  issues,
}: MaterialSectionProps) {
  const gradesForFamily = getMaterialGradesByFamily(activeFamily);
  const hasIssue = (field: string) => issues.some((i) => i.field === field);

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold text-slate-900">Material</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="family" className="text-xs font-medium text-slate-700">
            Family
          </label>
          <select
            id="family"
            value={activeFamily}
            onChange={(e) =>
              dispatch({ type: "SET_FAMILY", familyId: e.target.value as MetalFamilyId })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {METAL_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="grade" className="text-xs font-medium text-slate-700">
            Grade
          </label>
          <select
            id="grade"
            value={input.materialGradeId}
            onChange={(e) => dispatch({ type: "SET_GRADE", gradeId: e.target.value })}
            className={`rounded-md border bg-white px-3 py-2 text-sm ${
              hasIssue("materialGradeId") ? "border-red-400" : "border-slate-300"
            }`}
          >
            {gradesForFamily.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} ({g.densityKgPerM3} kg/m³)
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={input.useCustomDensity}
          onChange={(e) =>
            dispatch({ type: "SET_CUSTOM_DENSITY_TOGGLE", value: e.target.checked })
          }
        />
        Custom density
      </label>

      {input.useCustomDensity && (
        <div className="grid gap-1.5 sm:max-w-xs">
          <label htmlFor="custom-density" className="text-xs font-medium text-slate-700">
            Density (kg/m³)
          </label>
          <input
            id="custom-density"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            step="any"
            min={100}
            max={25000}
            value={input.customDensityKgPerM3 ?? ""}
            onChange={(e) =>
              dispatch({ type: "SET_CUSTOM_DENSITY", value: parseNumber(e.target.value) })
            }
            className={`rounded-md border bg-white px-3 py-2 text-sm ${
              hasIssue("customDensityKgPerM3") ? "border-red-400" : "border-slate-300"
            }`}
          />
        </div>
      )}
    </section>
  );
});
