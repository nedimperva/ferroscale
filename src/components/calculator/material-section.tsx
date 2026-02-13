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
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {/* crosshair icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>
        Material
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label htmlFor="family" className="text-xs font-medium text-slate-700">
            Family
          </label>
          <select
            id="family"
            value={activeFamily}
            onChange={(e) =>
              dispatch({ type: "SET_FAMILY", familyId: e.target.value as MetalFamilyId })
            }
            className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            {METAL_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="grade" className="text-xs font-medium text-slate-700">
            Grade
          </label>
          <select
            id="grade"
            value={input.materialGradeId}
            onChange={(e) => dispatch({ type: "SET_GRADE", gradeId: e.target.value })}
            className={`h-9 min-w-0 rounded-md border bg-white px-2 text-sm ${
              hasIssue("materialGradeId") ? "border-red-400" : "border-slate-300"
            }`}
          >
            {gradesForFamily.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} ({g.densityKgPerM3})
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
        <div className="grid gap-1 sm:max-w-xs">
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
            className={`h-9 rounded-md border bg-white px-2 text-sm ${
              hasIssue("customDensityKgPerM3") ? "border-red-400" : "border-slate-300"
            }`}
          />
        </div>
      )}
    </section>
  );
});
