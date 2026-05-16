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
import type { CalcAction } from "@/hooks/useCalculator";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { ResultPanel } from "./result-panel";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  result: CalculationResult | null;
  isPending: boolean;
  isSaved: boolean;
  issues: ValidationIssue[];
  selectedProfile: ProfileDefinition;
  activeFamily: MetalFamilyId;
  normalizedProfile: NormalizedProfileSnapshot | null;
  onOpenSaveDialog: () => void;
  onAddToProject: () => void;
  onOpenQuickCalc: () => void;
  onReset: () => void;
  // Result panel props
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  onCompare: () => void;
  canCompare: boolean;
  isInCompare: boolean;
  compareCount: number;
  maxCompare: number;
  hasProjects: boolean;
  weightAsMain: boolean;
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
 * D1 "Workstation" desktop pane. Sidebar lives in the parent shell;
 * this component renders everything to its right: a 56 px top bar
 * (title + selection breadcrumb chip + ⌘K search + New) and a 2-col
 * body with a tall form card on the left and a sticky result panel
 * on the right. Replaces the D3 Bench combo of DesktopFormPane +
 * DesktopProjectPane for the calculator route.
 */
export const DesktopWorkstationPane = memo(function DesktopWorkstationPane({
  input,
  dispatch,
  result,
  isPending,
  isSaved,
  issues,
  selectedProfile,
  normalizedProfile,
  onOpenSaveDialog,
  onAddToProject,
  onOpenQuickCalc,
  onReset,
  includeVat,
  wastePercent,
  vatPercent,
  onCompare,
  canCompare,
  isInCompare,
  compareCount,
  maxCompare,
  hasProjects,
  weightAsMain,
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

  // Selection breadcrumb chip — short profile · grade · length × qty.
  const breadcrumb = useMemo(() => {
    const short = t(`dataset.profileShort.${input.profileId}`);
    const gradeLabel = grade?.label ?? "—";
    const lengthValue = Number.isFinite(input.length.value)
      ? input.length.value
      : 0;
    const lengthDisplay =
      lengthValue % 1 === 0 ? String(lengthValue) : lengthValue.toFixed(2);
    const qty = Math.max(1, Math.floor(input.quantity || 1));
    return `${short} · ${gradeLabel} · ${lengthDisplay} ${input.length.unit} × ${qty}`;
  }, [
    t,
    grade?.label,
    input.profileId,
    input.length.unit,
    input.length.value,
    input.quantity,
  ]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <h2 className="truncate text-lg font-bold tracking-tight text-foreground">
            {t("tabs.calculator")}
          </h2>
          <span className="inline-flex max-w-[22rem] items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted">
            <span className="truncate">{breadcrumb}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onOpenQuickCalc();
            }}
            className="flex h-8 w-[280px] items-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs text-muted transition-colors hover:border-accent-border hover:text-foreground-secondary"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="flex-1 text-left">
              {t("workstation.searchHint")}
            </span>
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("workstation.new")}
          </button>
        </div>
      </div>

      {/* Body — 2 column */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_440px] gap-5 px-6 py-5">
        {/* Form column (scrollable card) */}
        <section className="flex min-h-0 flex-col gap-5 overflow-auto rounded-3xl border border-border bg-surface p-6">
          {/* Profile */}
          <div>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h3 className="text-2xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("desktopForm.profile")}
              </h3>
              <span className="text-xs text-muted">
                {t("workstationPane.profileHint")}
              </span>
            </div>

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

            {/* Size picker (standard) or dimension inputs (manual). */}
            {selectedProfile.mode === "standard" ? (
              <div className="mt-3 flex flex-col gap-1.5">
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
              <div className="mt-3 flex flex-col gap-1.5">
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
          </div>

          <div className="h-px bg-border" />

          {/* Geometry */}
          <div>
            <h3 className="mb-2.5 text-2xs font-bold uppercase tracking-[0.16em] text-muted">
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
                onChange={(v) =>
                  dispatch({ type: "SET_UNIT_PRICE", value: v })
                }
              />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Material */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-2xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("desktopForm.material")}
              </h3>
              <span className="text-xs text-muted">
                {grade
                  ? `${grade.densityKgPerM3} kg/m³`
                  : t("workstationPane.materialHint")}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {materialFamilies.map(({ family, grades }) => (
                <div key={family} className="flex items-center gap-2">
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
          </div>

          <div className="h-px bg-border" />

          {/* Advanced — collapsed accordion */}
          <details className="group rounded-2xl bg-surface-raised px-3.5 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15l-1.5-2.6M4.6 9L6 6.4M15 19.4l-2.6 1.5M9 4.6L6.4 6M19.4 9L21 6.4M4.6 15L6 17.6M15 4.6L17.6 6M9 19.4L6.4 18" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {t("workstationPane.advancedTitle")}
                  </div>
                  <div className="text-xs text-muted">
                    {t("workstationPane.advancedHint")}
                  </div>
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-faint">
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-2xs font-bold uppercase tracking-[0.12em] text-muted">
                  {t("workstationPane.vat")}
                </div>
                <div className="mt-0.5 font-semibold text-foreground tabular-nums">
                  {includeVat ? `${vatPercent}%` : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-2xs font-bold uppercase tracking-[0.12em] text-muted">
                  {t("workstationPane.waste")}
                </div>
                <div className="mt-0.5 font-semibold text-foreground tabular-nums">
                  {wastePercent}%
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-2xs font-bold uppercase tracking-[0.12em] text-muted">
                  {t("workstationPane.currency")}
                </div>
                <div className="mt-0.5 font-semibold text-foreground">
                  {input.currency}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-2xs font-bold uppercase tracking-[0.12em] text-muted">
                  {t("workstationPane.rounding")}
                </div>
                <div className="mt-0.5 font-semibold text-foreground">
                  {t("workstationPane.roundingDefault")}
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* Result column — sticky panel */}
        <div className="sticky top-0 min-h-0 self-start">
          <ResultPanel
            result={result}
            isPending={isPending}
            isSaved={isSaved}
            onOpenSaveDialog={onOpenSaveDialog}
            includeVat={includeVat}
            wastePercent={wastePercent}
            vatPercent={vatPercent}
            onCompare={onCompare}
            canCompare={canCompare}
            isInCompare={isInCompare}
            compareCount={compareCount}
            maxCompare={maxCompare}
            onAddToProject={onAddToProject}
            hasProjects={hasProjects}
            normalizedProfile={normalizedProfile}
            weightAsMain={weightAsMain}
            layout="standalone"
          />
        </div>
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
        <span className="shrink-0 text-sm font-semibold text-muted">
          {unit}
        </span>
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

function DimensionCell({
  label,
  range,
  value,
  unit,
  hasIssue,
  onChange,
}: DimensionCellProps) {
  return (
    <label
      className={`flex flex-col rounded-xl border bg-surface px-2.5 py-2 transition-colors ${
        hasIssue
          ? "border-red-border bg-red-surface"
          : "border-border hover:border-border-strong"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="truncate text-2xs font-semibold text-foreground-secondary">
          {label}
        </span>
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
