"use client";

import { memo, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import {
  MATERIAL_GRADES,
  getMaterialGradeById,
} from "@/lib/datasets/materials";
import type {
  CalculationInput,
  CalculationResult,
  ValidationIssue,
} from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type {
  DimensionKey,
  MetalFamilyId,
  ProfileCategory,
  ProfileDefinition,
  ProfileId,
} from "@/lib/datasets/types";
// MetalFamilyId is used via FAMILY_TONES record below.
import type { CalcAction } from "@/hooks/useCalculator";
import { DesktopMiniResult } from "./desktop-mini-result";
import { CompareTray } from "./compare-tray";
import type { CompareItem } from "@/hooks/useCompare";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  result: CalculationResult | null;
  isPending: boolean;
  isSaved: boolean;
  issues: ValidationIssue[];
  selectedProfile: ProfileDefinition;
  hasProjects: boolean;
  activeProjectName: string | null;
  onOpenSaveDialog: () => void;
  onAddToProject: () => void;
  onOpenQuickCalc: () => void;
  onReset: () => void;
  /** Compare tray state — pinned items + actions. */
  compareItems: CompareItem[];
  onRemoveCompareItem: (id: string) => void;
  onOpenCompare: () => void;
  onPinToCompare: () => void;
  canPinToCompare: boolean;
  isInCompare: boolean;
}

const CATEGORY_ORDER: ProfileCategory[] = [
  "structural",
  "tubes",
  "plates_sheets",
  "bars",
];

const FAMILY_TONES: Record<MetalFamilyId, string> = {
  steel: "#a08373",
  stainless_steel: "#bcc0c7",
  aluminum: "#aab4be",
};

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

type ActiveField = "length" | "quantity" | "price";

/**
 * D3 "Bench" desktop form pane. From the in-pane top bar all the way
 * down: header (title + project chip + ⌘K + New), dark mini live
 * result, then three rounded section cards — Profile, Geometry,
 * Material — that match the design bundle's mock pixel-for-pixel.
 * Every chip / cell dispatches through useCalculator directly; the
 * old ProfileSection is not used here.
 */
export const DesktopFormPane = memo(function DesktopFormPane({
  input,
  dispatch,
  result,
  isPending,
  isSaved,
  issues,
  selectedProfile,
  hasProjects,
  activeProjectName,
  onOpenSaveDialog,
  onAddToProject,
  onOpenQuickCalc,
  onReset,
  compareItems,
  onRemoveCompareItem,
  onOpenCompare,
  onPinToCompare,
  canPinToCompare,
  isInCompare,
}: Props) {
  const t = useTranslations();

  const grouped = useMemo(() => groupByCategory(PROFILE_DEFINITIONS), []);
  const activeCategory = selectedProfile.category;
  const categoryProfiles = useMemo(
    () => grouped.get(activeCategory) ?? [],
    [grouped, activeCategory],
  );

  // Group material grades by family for the section UI.
  const materialFamilies = useMemo(() => {
    const order: MetalFamilyId[] = ["steel", "stainless_steel", "aluminum"];
    return order
      .map((family) => ({
        family,
        grades: MATERIAL_GRADES.filter((g) => g.familyId === family),
      }))
      .filter((entry) => entry.grades.length > 0);
  }, []);

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

  const [activeField, setActiveField] = useState<ActiveField>("length");

  const grade = getMaterialGradeById(input.materialGradeId);
  const currency = CURRENCY_SYMBOLS[input.currency] ?? input.currency;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
      {/* In-pane header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-base font-bold tracking-tight text-foreground">
            {t("tabs.calculator")}
          </h2>
          {activeProjectName && (
            <span className="inline-flex max-w-[14rem] items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-faint">
              <span className="mr-1.5 truncate">
                {t("desktopForm.projectChip", { name: activeProjectName })}
              </span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onOpenQuickCalc();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-muted-faint transition-colors hover:border-accent-border hover:text-foreground-secondary"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span>{t("desktopForm.search")}</span>
            <kbd className="inline-flex h-5 items-center rounded-md border border-border bg-surface-raised px-1.5 text-2xs font-semibold text-muted-faint">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onReset();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-xs font-semibold text-background shadow-[0_10px_24px_-12px_rgba(20,18,15,0.4)] transition-colors hover:bg-foreground/90"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("desktopForm.new")}
          </button>
        </div>
      </div>

      {/* Body — fits viewport without scrolling. The only scroll on the
          desktop calculator route is inside the project pane's parts
          list. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-5 py-3">
        {/* Live mini-result */}
        <DesktopMiniResult
          result={result}
          isPending={isPending}
          isSaved={isSaved}
          profileId={input.profileId}
          onSave={onOpenSaveDialog}
          onAddToProject={onAddToProject}
          onPinToCompare={onPinToCompare}
          hasProjects={hasProjects}
          canAddToProject={!!result}
          isInCompare={isInCompare}
          canPinToCompare={canPinToCompare}
        />

        <CompareTray
          items={compareItems}
          onRemove={onRemoveCompareItem}
          onOpen={onOpenCompare}
        />

        {/* Profile section */}
        <section className="rounded-2xl border border-border bg-surface p-3">
          <h3 className="mb-2 text-2xs font-bold uppercase tracking-[0.16em] text-muted">
            {t("desktopForm.profile")}
          </h3>

          {/* Category row */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground-secondary hover:border-border-strong"
                  }`}
                >
                  <ProfileIcon category={cat} className="h-4 w-4" />
                  {t(`dataset.profileCategories.${cat}`)}
                </button>
              );
            })}
          </div>

          {/* Profile grid */}
          <div className="mt-2.5 grid grid-cols-4 gap-1.5 xl:grid-cols-6">
            {categoryProfiles.map((p) => {
              const isActive = p.id === input.profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProfileChange(p.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2 text-center transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground hover:border-border-strong"
                  }`}
                >
                  <ProfileGlyph profileId={p.id} size="md" />
                  <span className="truncate text-xs font-semibold tracking-tight">
                    {t(`dataset.profileShort.${p.id}`)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Size picker (standard profiles) or dimension inputs (manual). */}
          {selectedProfile.mode === "standard" ? (
            <div className="mt-2.5 flex flex-col gap-1.5">
              <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                {t("desktopForm.size")}
              </span>
              <div className="flex max-h-[8.5rem] flex-wrap gap-1 overflow-y-auto pr-1">
                {selectedProfile.sizes.map((s) => {
                  const isActive = s.id === input.selectedSizeId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (s.id === input.selectedSizeId) return;
                        triggerHaptic("light");
                        dispatch({ type: "SET_SIZE", sizeId: s.id });
                      }}
                      className={`inline-flex h-7 items-center rounded-md border px-2 text-2xs font-semibold tabular-nums transition-colors ${
                        isActive
                          ? "border-accent-border bg-accent-surface text-accent-text"
                          : "border-border bg-surface text-foreground-secondary hover:border-border-strong"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-1.5">
              <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                {t("desktopForm.dimensions")}
              </span>
              <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-4">
                {selectedProfile.dimensions.map((dim) => {
                  const stored = input.manualDimensions[dim.key];
                  const value = stored?.value ?? 0;
                  const unit = stored?.unit ?? input.length.unit;
                  const issue = issues.find(
                    (i) => i.field === `manualDimensions.${dim.key}`,
                  );
                  return (
                    <DimensionCell
                      key={dim.key}
                      label={t(`dataset.dimensions.${dim.key}`)}
                      range={`${dim.minMm}–${dim.maxMm} mm`}
                      value={value}
                      unit={unit}
                      hasIssue={!!issue}
                      onChange={(v) =>
                        dispatch({
                          type: "SET_DIMENSION_VALUE",
                          key: dim.key as DimensionKey,
                          value: v,
                        })
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Geometry section */}
        <section className="rounded-2xl border border-border bg-surface p-3">
          <h3 className="mb-2 text-2xs font-bold uppercase tracking-[0.16em] text-muted">
            {t("desktopForm.geometry")}
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <GeometryField
              label={t("desktopForm.length")}
              hint={t("desktopForm.lengthHint", { unit: input.length.unit })}
              value={input.length.value || 0}
              unit={input.length.unit}
              decimals={3}
              isActive={activeField === "length"}
              hasIssue={issues.some((i) => i.field === "length")}
              onFocus={() => setActiveField("length")}
              onChange={(v) =>
                dispatch({ type: "SET_LENGTH_VALUE", value: v })
              }
            />
            <GeometryField
              label={t("desktopForm.pieces")}
              hint={t("desktopForm.piecesHint")}
              value={input.quantity || 0}
              unit="×"
              decimals={0}
              isActive={activeField === "quantity"}
              hasIssue={issues.some((i) => i.field === "quantity")}
              onFocus={() => setActiveField("quantity")}
              onChange={(v) =>
                dispatch({
                  type: "SET_QUANTITY",
                  value: Math.max(1, Math.floor(v)),
                })
              }
            />
            <GeometryField
              label={t("desktopForm.unitPrice")}
              hint={t("desktopForm.unitPriceHint")}
              value={input.unitPrice ?? 0}
              unit={`${currency}/kg`}
              decimals={2}
              isActive={activeField === "price"}
              hasIssue={issues.some((i) => i.field === "unitPrice")}
              onFocus={() => setActiveField("price")}
              onChange={(v) => dispatch({ type: "SET_UNIT_PRICE", value: v })}
            />
          </div>
        </section>

        {/* Material section */}
        <section className="rounded-2xl border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-2xs font-bold uppercase tracking-[0.16em] text-muted">
              {t("desktopForm.material")}
            </h3>
            <span className="text-xs text-muted">
              {grade ? `${grade.densityKgPerM3} kg/m³` : ""}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {materialFamilies.map(({ family, grades }) => (
              <div
                key={family}
                className="flex items-center gap-2"
              >
                <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-surface-raised px-2 text-2xs font-bold uppercase tracking-[0.12em] text-foreground-secondary">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: FAMILY_TONES[family] }}
                  />
                  {t(`dataset.families.${family}`)}
                </span>
                <div className="flex flex-wrap gap-1">
                  {grades.map((g) => {
                    const isActive = g.id === input.materialGradeId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (g.id === input.materialGradeId) return;
                          triggerHaptic("light");
                          dispatch({ type: "SET_GRADE", gradeId: g.id });
                        }}
                        className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold tracking-tight transition-colors ${
                          isActive
                            ? "border-accent-border bg-accent-surface text-accent-text"
                            : "border-border bg-surface text-foreground hover:border-border-strong"
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
});

interface GeometryFieldProps {
  label: string;
  hint: string;
  value: number;
  unit: string;
  decimals: number;
  isActive: boolean;
  hasIssue: boolean;
  onFocus: () => void;
  onChange: (next: number) => void;
}

function GeometryField({
  label,
  hint,
  value,
  unit,
  decimals,
  isActive,
  hasIssue,
  onFocus,
  onChange,
}: GeometryFieldProps) {
  const display = Number.isFinite(value)
    ? decimals === 0
      ? String(value)
      : value.toFixed(decimals)
    : "0";

  return (
    <label
      className={`group flex cursor-text flex-col rounded-2xl border px-3.5 py-3 transition-colors ${
        hasIssue
          ? "border-red-border bg-red-surface"
          : isActive
            ? "border-accent-border bg-accent-surface"
            : "border-border bg-surface hover:border-border-strong"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-2xs font-bold uppercase tracking-[0.14em] ${
            isActive ? "text-accent-text" : "text-muted"
          }`}
        >
          {label}
        </span>
        <span
          className={`text-2xs ${
            isActive ? "text-accent-text/70" : "text-muted-faint"
          }`}
        >
          {hint}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <input
          type="number"
          step={decimals === 0 ? 1 : decimals === 2 ? 0.01 : 0.001}
          min={0}
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onFocus={onFocus}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = Number.parseFloat(raw);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          className="w-full bg-transparent text-2xl font-bold tracking-[-0.04em] tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
          aria-label={label}
        />
        <span className="shrink-0 text-sm font-semibold text-muted">{unit}</span>
      </div>

      <span className="sr-only">{display}</span>
    </label>
  );
}

interface DimensionCellProps {
  label: string;
  range: string;
  value: number;
  unit: string;
  hasIssue: boolean;
  onChange: (next: number) => void;
}

function DimensionCell({ label, range, value, unit, hasIssue, onChange }: DimensionCellProps) {
  return (
    <label
      className={`flex flex-col rounded-xl border bg-surface px-2.5 py-2 transition-colors ${
        hasIssue ? "border-red-border bg-red-surface" : "border-border hover:border-border-strong"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="truncate text-2xs font-semibold text-foreground-secondary">{label}</span>
        <span className="text-2xs text-muted-faint">{range}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <input
          type="number"
          step={0.1}
          min={0}
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          className="w-full bg-transparent text-base font-bold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
        />
        <span className="text-[0.65rem] font-semibold text-muted">{unit}</span>
      </div>
    </label>
  );
}
