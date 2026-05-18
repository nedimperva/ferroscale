"use client";

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  METAL_FAMILIES,
  getMaterialGradesByFamily,
} from "@/lib/datasets/materials";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { CalculationInput } from "@/lib/calculator/types";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  activeFamily: MetalFamilyId;
}

const FAMILY_TONES: Record<MetalFamilyId, string> = {
  steel: "#a08373",
  stainless_steel: "#bcc0c7",
  aluminum: "#aab4be",
};

export const MobileMaterialSheet = memo(function MobileMaterialSheet({
  open,
  onOpenChange,
  input,
  dispatch,
  activeFamily,
}: Props) {
  const t = useTranslations();

  const grades = useMemo(
    () => getMaterialGradesByFamily(activeFamily),
    [activeFamily],
  );

  const handleFamily = (id: MetalFamilyId) => {
    if (id === activeFamily) return;
    triggerHaptic("light");
    dispatch({ type: "SET_FAMILY", familyId: id });
  };

  const handleGrade = (gradeId: string) => {
    if (gradeId === input.materialGradeId) return;
    triggerHaptic("light");
    dispatch({ type: "SET_GRADE", gradeId });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("mobileCalc.material")}
    >
      <div className="flex flex-col gap-4">
        {/* Family pills */}
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("mobileCalc.family")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {METAL_FAMILIES.map((f) => {
              const isActive = f.id === activeFamily;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFamily(f.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground-secondary"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: FAMILY_TONES[f.id] }}
                  />
                  {t(`dataset.families.${f.id}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade list */}
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("mobileCalc.grade")}
          </span>
          <div className="flex flex-col gap-1.5">
            {grades.map((g) => {
              const isActive = g.id === input.materialGradeId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGrade(g.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground"
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold tracking-tight">{g.label}</span>
                    <span className="text-2xs text-muted">{g.referenceLabel}</span>
                  </span>
                  <span className="text-2xs tabular-nums text-muted">
                    {g.densityKgPerM3.toLocaleString()} kg/m³
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-1 flex h-11 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background active:bg-foreground/90"
        >
          {t("mobileCalc.done")}
        </button>
      </div>
    </BottomSheet>
  );
});
