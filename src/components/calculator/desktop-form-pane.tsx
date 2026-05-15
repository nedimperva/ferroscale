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
  MetalFamilyId,
  ProfileCategory,
  ProfileDefinition,
  ProfileId,
} from "@/lib/datasets/types";
// MetalFamilyId is used via FAMILY_TONES record below.
import type { CalcAction } from "@/hooks/useCalculator";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { DesktopMiniResult } from "./desktop-mini-result";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  result: CalculationResult | null;
  isPending: boolean;
  isSaved: boolean;
  normalizedProfile: NormalizedProfileSnapshot | null;
  issues: ValidationIssue[];
  selectedProfile: ProfileDefinition;
  hasProjects: boolean;
  activeProjectName: string | null;
  onOpenSaveDialog: () => void;
  onAddToProject: () => void;
  onOpenQuickCalc: () => void;
  onReset: () => void;
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
  normalizedProfile,
  issues,
  selectedProfile,
  hasProjects,
  activeProjectName,
  onOpenSaveDialog,
  onAddToProject,
  onOpenQuickCalc,
  onReset,
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
          normalizedProfile={normalizedProfile}
          onSave={onOpenSaveDialog}
          onAddToProject={onAddToProject}
          hasProjects={hasProjects}
          canAddToProject={!!result}
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
          <div className="mt-3 grid grid-cols-4 gap-1.5 xl:grid-cols-6">
            {categoryProfiles.map((p) => {
              const isActive = p.id === input.profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProfileChange(p.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface text-accent-text"
                      : "border-border bg-surface text-foreground hover:border-border-strong"
                  }`}
                >
                  <ProfileIcon category={p.category} className="h-5 w-5" />
                  <span className="truncate text-xs font-semibold tracking-tight">
                    {t(`dataset.profileShort.${p.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
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
          <div className="flex flex-wrap gap-1.5">
            {MATERIAL_GRADES.map((g) => {
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
                  className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface"
                      : "border-border bg-surface hover:border-border-strong"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: FAMILY_TONES[g.familyId] }}
                  />
                  <span
                    className={`text-xs font-semibold tracking-tight ${
                      isActive ? "text-accent-text" : "text-foreground"
                    }`}
                  >
                    {g.label}
                  </span>
                  <span className="text-2xs tabular-nums text-muted">
                    · {g.densityKgPerM3}
                  </span>
                </button>
              );
            })}
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
      <div className="mt-1.5 flex items-baseline gap-1">
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
          className="w-full bg-transparent text-3xl font-bold tracking-[-0.04em] tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
          aria-label={label}
        />
        <span className="shrink-0 text-sm font-semibold text-muted">{unit}</span>
      </div>
      <span className="sr-only">{display}</span>
    </label>
  );
}
