import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, ValidationIssue } from "@/lib/calculator/types";
import { METAL_FAMILIES, getMaterialGradesByFamily, getMaterialGradeById } from "@/lib/datasets/materials";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { NumericInput } from "./numeric-input";

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
  const t = useTranslations();
  const gradesForFamily = getMaterialGradesByFamily(activeFamily);
  const hasIssue = (field: string) => issues.some((i) => i.field === field);

  const grade = getMaterialGradeById(input.materialGradeId);
  const effectiveDensity = input.useCustomDensity
    ? (input.customDensityKgPerM3 ?? "?")
    : (grade?.densityKgPerM3 ?? "?");
  const family = METAL_FAMILIES.find((f) => f.id === activeFamily);

  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {/* crosshair icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10" /><line x1="22" x2="18" y1="12" y2="12" /><line x1="6" x2="2" y1="12" y2="12" /><line x1="12" x2="12" y1="6" y2="2" /><line x1="12" x2="12" y1="22" y2="18" /></svg>
        {t("material.title")}
      </h3>

      {/* Live preview */}
      <div className="rounded-lg bg-accent-surface px-3 py-2 text-xs text-foreground-secondary">
        <span className="font-medium text-accent">{grade?.label ?? "—"}</span>
        <span className="mx-1.5 text-muted-faint">·</span>
        <span>{family ? t(`dataset.families.${family.id}`) : "-"}</span>
        <span className="mx-1.5 text-muted-faint">·</span>
        <span className="text-muted">
          {effectiveDensity} kg/m3
          {input.useCustomDensity ? ` ${t("material.customSuffix")}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label htmlFor="family" className="text-xs font-medium text-foreground-secondary">
            {t("material.family")}
          </label>
          <select
            id="family"
            value={activeFamily}
            onChange={(e) =>
              dispatch({ type: "SET_FAMILY", familyId: e.target.value as MetalFamilyId })
            }
            className="h-10 min-w-0 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
          >
            {METAL_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {t(`dataset.families.${f.id}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="grade" className="text-xs font-medium text-foreground-secondary">
            {t("material.grade")}
          </label>
          <select
            id="grade"
            value={input.materialGradeId}
            onChange={(e) => dispatch({ type: "SET_GRADE", gradeId: e.target.value })}
            className={`h-10 min-w-0 rounded-md border bg-surface px-2 text-sm transition-colors focus:border-blue-500 ${hasIssue("materialGradeId") ? "border-red-400" : "border-border-strong"
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
        {t("material.customDensity")}
      </label>

      {input.useCustomDensity && (
        <div className="grid gap-1 sm:max-w-xs">
          <label htmlFor="custom-density" className="text-xs font-medium text-foreground-secondary">
            {t("material.density")}
          </label>
          <NumericInput
            id="custom-density"
            inputMode="decimal"
            autoComplete="off"
            value={input.customDensityKgPerM3}
            onValueChange={(value) => dispatch({ type: "SET_CUSTOM_DENSITY", value })}
            className={`h-10 rounded-md border bg-surface px-2 text-sm transition-colors focus:border-blue-500 ${hasIssue("customDensityKgPerM3") ? "border-red-400" : "border-border-strong"
              }`}
            aria-invalid={hasIssue("customDensityKgPerM3")}
          />
        </div>
      )}
    </section>
  );
});
