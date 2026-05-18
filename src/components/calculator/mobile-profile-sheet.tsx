"use client";

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import type {
  ProfileCategory,
  ProfileDefinition,
  ProfileId,
} from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { CalculationInput, ValidationIssue } from "@/lib/calculator/types";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { DimensionKey } from "@/lib/datasets/types";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { DimensionInput } from "./dimension-input";
import { SizeCombobox } from "./size-combobox";
import { StandardSizePicker } from "./standard-size-picker";
import { triggerHaptic } from "@/lib/haptics";

const CATEGORY_ORDER: ProfileCategory[] = [
  "structural",
  "tubes",
  "plates_sheets",
  "bars",
];

function groupByCategory(
  defs: ProfileDefinition[],
): Map<ProfileCategory, ProfileDefinition[]> {
  const map = new Map<ProfileCategory, ProfileDefinition[]>();
  for (const p of defs) {
    const group = map.get(p.category);
    if (group) group.push(p);
    else map.set(p.category, [p]);
  }
  return map;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  selectedProfile: ProfileDefinition;
  issues: ValidationIssue[];
  customPresets: DimensionPreset[];
}

export const MobileProfileSheet = memo(function MobileProfileSheet({
  open,
  onOpenChange,
  input,
  dispatch,
  selectedProfile,
  issues,
  customPresets,
}: Props) {
  const t = useTranslations();
  const grouped = useMemo(() => groupByCategory(PROFILE_DEFINITIONS), []);
  const activeCategory = selectedProfile.category;
  const categoryProfiles = useMemo(
    () => grouped.get(activeCategory) ?? [],
    [grouped, activeCategory],
  );

  const handleCategoryChange = (cat: ProfileCategory) => {
    if (cat === activeCategory) return;
    triggerHaptic("light");
    const profiles = grouped.get(cat);
    if (profiles?.[0]) {
      dispatch({ type: "SET_PROFILE", profileId: profiles[0].id });
    }
  };

  const handleProfileChange = (profileId: ProfileId) => {
    if (profileId === input.profileId) return;
    triggerHaptic("light");
    dispatch({ type: "SET_PROFILE", profileId });
  };

  const isManual = selectedProfile.mode === "manual";

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t("mobileCalc.profile")}>
      <div className="flex flex-col gap-4">
        {/* Category row */}
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("profileSection.category")}
          </span>
          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORY_ORDER.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground-secondary"
                  }`}
                >
                  <ProfileIcon category={cat} className="h-3.5 w-3.5" />
                  {t(`dataset.profileCategories.${cat}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile-type grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("profileSection.type")}
          </span>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {categoryProfiles.map((p) => {
              const isActive = p.id === input.profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProfileChange(p.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground"
                  }`}
                >
                  <ProfileGlyph profileId={p.id} size="sm" />
                  <span className="truncate font-semibold leading-tight">
                    {t(`dataset.profileShort.${p.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Size / dimensions */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-raised p-3">
          {isManual && selectedProfile.mode === "manual" ? (
            <>
              <StandardSizePicker
                profileId={input.profileId}
                customPresets={customPresets}
                activeDimensions={Object.fromEntries(
                  Object.entries(input.manualDimensions).map(([k, v]) => [k, v?.value]),
                ) as Partial<Record<DimensionKey, number>>}
                onApply={(dims) =>
                  dispatch({ type: "SET_DIMENSIONS_MM", dimensions: dims })
                }
              />
              <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                {t("mobileCalc.dimensions")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {selectedProfile.dimensions.map((dim) => {
                  const stored = input.manualDimensions[dim.key];
                  const value = stored ?? { value: 0, unit: input.length.unit };
                  const issue = issues.find(
                    (i) => i.field === `manualDimensions.${dim.key}`,
                  );
                  return (
                    <DimensionInput
                      key={dim.key}
                      dimension={dim}
                      value={value}
                      onValueChange={(v) =>
                        dispatch({
                          type: "SET_DIMENSION_VALUE",
                          key: dim.key,
                          value: v,
                        })
                      }
                      unit={value.unit}
                      hasIssue={!!issue}
                      issueMessage={issue?.message}
                    />
                  );
                })}
              </div>
            </>
          ) : selectedProfile.mode === "standard" ? (
            <>
              <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                {t("profileSection.size")}
              </span>
              <SizeCombobox
                sizes={selectedProfile.sizes}
                value={input.selectedSizeId ?? selectedProfile.sizes[0]?.id}
                onChange={(sizeId) => dispatch({ type: "SET_SIZE", sizeId })}
                hasIssue={issues.some((i) => i.field === "selectedSizeId")}
                label={t("profileSection.size")}
              />
            </>
          ) : null}
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
