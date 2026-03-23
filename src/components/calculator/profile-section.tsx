import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, LengthUnit, ValidationIssue } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import { METAL_FAMILIES, getMaterialGradesByFamily } from "@/lib/datasets/materials";
import type { ProfileCategory, ProfileDefinition, ProfileId, MetalFamilyId } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { DimensionKey } from "@/lib/datasets/types";
import type { DimensionPreset } from "@/hooks/usePresets";
import { DimensionInput } from "./dimension-input";
import { NumericInput } from "./numeric-input";
import { SizeCombobox } from "./size-combobox";
import { StandardsCombobox } from "./standards-combobox";
import { triggerHaptic } from "@/lib/haptics";

/** Ordered list of categories for the top-level tabs. */
const CATEGORY_ORDER: ProfileCategory[] = ["structural", "tubes", "plates_sheets", "bars"];

/** SVG icons per category (small, inline). */
const CATEGORY_ICONS: Record<ProfileCategory, React.ReactNode> = {
  structural: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 4h16v4H4zM8 8v12M16 8v12" />
    </svg>
  ),
  tubes: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />
    </svg>
  ),
  plates_sheets: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="8" width="18" height="8" rx="1" />
    </svg>
  ),
  bars: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
};

/** SVG icon per profile — represents the cross-section shape. */
const PROFILE_ICONS: Partial<Record<ProfileId, React.ReactNode>> = {
  /* ── Bars (solid cross-sections) ── */
  round_bar: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  square_bar: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" stroke="none">
      <rect x="3" y="3" width="18" height="18" rx="1" />
    </svg>
  ),
  flat_bar: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" stroke="none">
      <rect x="2" y="7" width="20" height="10" rx="1" />
    </svg>
  ),

  /* ── Tubes (hollow cross-sections) ── */
  pipe: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />
    </svg>
  ),
  rectangular_tube: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="1" /><rect x="6" y="8" width="12" height="8" rx="0.5" />
    </svg>
  ),
  square_hollow: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="1" /><rect x="7" y="7" width="10" height="10" rx="0.5" />
    </svg>
  ),

  /* ── Plates & Sheets ── */
  sheet: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="9" width="20" height="6" rx="0.5" />
    </svg>
  ),
  plate: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="10" rx="1" />
    </svg>
  ),
  chequered_plate: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="10" rx="1" />
      <line x1="7" y1="7" x2="7" y2="17" strokeWidth="1" opacity="0.4" />
      <line x1="12" y1="7" x2="12" y2="17" strokeWidth="1" opacity="0.4" />
      <line x1="17" y1="7" x2="17" y2="17" strokeWidth="1" opacity="0.4" />
    </svg>
  ),
  expanded_metal: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="10" rx="1" strokeWidth="2" />
      <path d="M5 9l3 2-3 2M9 9l3 2-3 2M13 9l3 2-3 2M17 9l3 2-3 2" strokeWidth="1" opacity="0.5" />
    </svg>
  ),
  corrugated_sheet: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0" />
    </svg>
  ),

  /* ── Structural — Beams ── */
  beam_ipe_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12M6 21h12M12 3v18" />
    </svg>
  ),
  beam_ipn_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12M6 21h12M12 3v18" strokeWidth="2.5" />
    </svg>
  ),
  beam_hea_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 3h16M4 21h16M12 3v18" />
    </svg>
  ),
  beam_heb_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 3h16M4 21h16M12 3v18" />
    </svg>
  ),
  beam_hem_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 3h16M4 21h16M12 3v18" />
    </svg>
  ),

  /* ── Structural — Channels ── */
  channel_upn_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12M6 3v18M6 21h12" />
    </svg>
  ),
  channel_upe_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h10M6 3v18M6 21h10" />
    </svg>
  ),

  /* ── Structural — Angle ── */
  angle: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 4v16h16" />
    </svg>
  ),

  /* ── Structural — Tee ── */
  tee_en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16M12 4v17" />
    </svg>
  ),
};

/** Group profiles by category, preserving order of first occurrence. */
function groupByCategory(profiles: ProfileDefinition[]) {
  const map = new Map<ProfileCategory, ProfileDefinition[]>();
  for (const p of profiles) {
    const group = map.get(p.category);
    if (group) {
      group.push(p);
    } else {
      map.set(p.category, [p]);
    }
  }
  return map;
}

interface ProfileSectionProps {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  selectedProfile: ProfileDefinition;
  issues: ValidationIssue[];
  activeFamily: MetalFamilyId;
  showInlineMaterial: boolean;
  showInlinePrice: boolean;
  defaultUnit: LengthUnit;
  onSavePreset: () => void;
  profilePresets: DimensionPreset[];
  onRemovePreset: (id: string) => void;
}

export const ProfileSection = memo(function ProfileSection({
  input,
  dispatch,
  selectedProfile,
  issues,
  activeFamily,
  showInlineMaterial,
  showInlinePrice,
  defaultUnit,
  onSavePreset,
  profilePresets,
  onRemovePreset,
}: ProfileSectionProps) {
  const t = useTranslations();
  const hasIssue = (field: string) => issues.some((i) => i.field === field);
  const getIssueMessage = (field: string) => {
    const issue = issues.find((item) => item.field === field);
    if (!issue) return undefined;

    const values = issue.messageValues;
    const resolvedValues = values && typeof values.labelKey === "string"
      ? { ...values, label: t(values.labelKey) }
      : values;

    return issue.messageKey
      ? t(issue.messageKey, resolvedValues)
      : issue.message;
  };
  const grouped = useMemo(() => groupByCategory(PROFILE_DEFINITIONS), []);

  const activeCategory = selectedProfile.category;
  const categoryProfiles = useMemo(
    () => grouped.get(activeCategory) ?? [],
    [grouped, activeCategory],
  );

  /** Switch to a different category — auto-select its first profile. */
  const handleCategoryChange = (cat: ProfileCategory) => {
    if (cat === activeCategory) return;
    triggerHaptic("light");
    const profiles = grouped.get(cat);
    if (profiles?.[0]) {
      dispatch({ type: "SET_PROFILE", profileId: profiles[0].id });
    }
  };

  return (
    <section className="grid gap-1 md:gap-3">
      {/* ── Profile selection group ── */}
      <div className="form-group lg:bg-transparent lg:p-0">
        {/* Category pills */}
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted">{t("profileSection.category")}</span>
          <div className="flex flex-wrap gap-1">
            {CATEGORY_ORDER.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all md:px-2.5 md:py-1.5 md:text-xs ${isActive
                    ? "border-blue-strong bg-blue-surface text-blue-text shadow-sm"
                    : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-raised"
                    }`}
                >
                  {CATEGORY_ICONS[cat]}
                  {t(`dataset.profileCategories.${cat}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="my-1.5 border-t border-border-faint lg:hidden" />

        {/* Sub-type pills */}
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted">{t("profileSection.type")}</span>
          <div className="flex flex-wrap gap-1">
            {categoryProfiles.map((p) => {
              const isActive = p.id === input.profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    dispatch({ type: "SET_PROFILE", profileId: p.id });
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all md:px-2.5 md:py-1.5 md:text-xs ${isActive
                    ? "border-blue-strong bg-blue-surface text-blue-text shadow-sm"
                    : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-raised"
                    }`}
                >
                  {PROFILE_ICONS[p.id]}
                  {t(`dataset.profileShort.${p.id}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Inline material selector (optional, off by default) ── */}
      {showInlineMaterial && (
        <div className="form-group lg:bg-transparent lg:p-0">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted">{t("material.title")}</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="relative">
                <select
                  value={activeFamily}
                  onChange={(e) => {
                    triggerHaptic("light");
                    dispatch({ type: "SET_FAMILY", familyId: e.target.value as MetalFamilyId });
                  }}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-surface px-2.5 pr-7 text-xs font-medium transition-colors focus:border-blue-500"
                  aria-label={t("material.family")}
                >
                  {METAL_FAMILIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {t(`dataset.families.${f.id}`)}
                    </option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-faint">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="relative">
                <select
                  value={input.materialGradeId}
                  onChange={(e) => {
                    triggerHaptic("light");
                    dispatch({ type: "SET_GRADE", gradeId: e.target.value });
                  }}
                  className={`h-9 w-full appearance-none rounded-lg border bg-surface px-2.5 pr-7 text-xs font-medium transition-colors focus:border-blue-500 ${
                    issues.some((i) => i.field === "materialGradeId")
                      ? "border-red-border"
                      : "border-border"
                  }`}
                  aria-label={t("material.grade")}
                >
                  {getMaterialGradesByFamily(activeFamily).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-faint">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Size / Dimensions + Length group ── */}
      <div className="form-group lg:bg-transparent lg:p-0">
        {/* Standard profile: searchable size combobox */}
        {selectedProfile.mode === "standard" && (
          <SizeCombobox
            sizes={selectedProfile.sizes}
            value={input.selectedSizeId ?? selectedProfile.sizes[0]?.id}
            onChange={(sizeId) => dispatch({ type: "SET_SIZE", sizeId })}
            hasIssue={hasIssue("selectedSizeId")}
            label={t("profileSection.size")}
            hint={t("profileSection.enArea")}
          />
        )}

        {/* Manual dimensions */}
        {selectedProfile.mode === "manual" && (
          <>
            <StandardsCombobox
              profileId={input.profileId}
              onSelect={(dims) => {
                for (const [key, value] of Object.entries(dims)) {
                  if (value != null) {
                    dispatch({ type: "SET_DIMENSION_VALUE", key: key as DimensionKey, value });
                  }
                }
              }}
              currentDimensions={input.manualDimensions}
              customSizes={profilePresets.map((p) => ({
                id: p.id,
                label: p.label,
                dimensions: p.manualDimensionsMm,
              }))}
              onRemoveCustom={onRemovePreset}
            />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {selectedProfile.dimensions.map((dim) => (
                <DimensionInput
                  key={dim.key}
                  dimension={dim}
                  value={input.manualDimensions[dim.key]}
                  unit={defaultUnit}
                  hasIssue={hasIssue(`manualDimensions.${dim.key}`)}
                  issueMessage={getIssueMessage(`manualDimensions.${dim.key}`)}
                  onValueChange={(v) =>
                    dispatch({ type: "SET_DIMENSION_VALUE", key: dim.key, value: v })
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onSavePreset}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-faint transition-colors hover:text-foreground-secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
              {t("presets.saveCustom")}
            </button>
          </>
        )}

        {/* Divider between dimensions and length */}
        <div className="my-1.5 border-t border-border-faint" />

        {/* Piece length */}
        <div className="grid gap-1 min-w-0">
          <label htmlFor="length" className="text-xs font-medium text-foreground-secondary">
            {t("profileSection.pieceLength")}
          </label>
          <div className="relative min-w-0">
            <NumericInput
              id="length"
              inputMode="decimal"
              autoComplete="off"
              value={input.length.value}
              onValueChange={(value) => dispatch({ type: "SET_LENGTH_VALUE", value })}
              className={`h-10 w-full rounded-lg border bg-surface px-2.5 pr-10 text-sm transition-colors focus:border-blue-500 md:h-11 ${hasIssue("length") ? "border-red-border" : "border-border-strong"
                }`}
              aria-invalid={hasIssue("length")}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-faint">
              {defaultUnit}
            </span>
          </div>
        </div>
      </div>

      {/* ── Quantity + Price group ── */}
      <div className="form-group lg:bg-transparent lg:p-0">
        <div className={`grid gap-2 ${showInlinePrice ? "grid-cols-[1fr_1fr]" : "grid-cols-1"}`}>
          {/* Quantity with stepper */}
          <div className="grid min-w-0 gap-1">
            <label htmlFor="quantity" className="text-xs font-medium text-foreground-secondary">
              {t("profileSection.quantity")}
            </label>
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (input.quantity > 1) {
                    triggerHaptic("light");
                    dispatch({ type: "SET_QUANTITY", value: input.quantity - 1 });
                  }
                }}
                disabled={input.quantity <= 1}
                className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-foreground-secondary transition-colors hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t("profileSection.decreaseQuantity")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" />
                </svg>
              </button>
              <NumericInput
                id="quantity"
                inputMode="numeric"
                autoComplete="off"
                value={input.quantity}
                onValueChange={(value) => dispatch({ type: "SET_QUANTITY", value })}
                className={`h-10 min-w-0 flex-1 rounded-lg border bg-surface px-2 text-center text-sm font-medium transition-colors focus:border-blue-500 ${hasIssue("quantity") ? "border-red-border" : "border-border-strong"
                  }`}
                aria-invalid={hasIssue("quantity")}
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  dispatch({ type: "SET_QUANTITY", value: input.quantity + 1 });
                }}
                className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-foreground-secondary transition-colors hover:bg-surface-raised"
                aria-label={t("profileSection.increaseQuantity")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Inline unit price (optional, on by default) */}
          {showInlinePrice && (
            <div className="grid min-w-0 gap-1">
              <label htmlFor="inline-unit-price" className="text-xs font-medium text-foreground-secondary">
                {t("profileSection.unitPrice")}
              </label>
              <div className="flex min-w-0">
                <NumericInput
                  id="inline-unit-price"
                  inputMode="decimal"
                  autoComplete="off"
                  value={input.unitPrice}
                  onValueChange={(value) => dispatch({ type: "SET_UNIT_PRICE", value })}
                  className={`h-10 min-w-0 flex-1 rounded-l-lg border bg-surface px-2 text-sm transition-colors focus:border-blue-500 ${hasIssue("unitPrice") ? "border-red-border" : "border-border-strong"
                    }`}
                  aria-invalid={hasIssue("unitPrice")}
                />
                <span className="flex h-10 shrink-0 items-center rounded-r-lg border border-l-0 border-border-strong bg-surface-raised px-1.5 text-[11px] text-muted">
                  {CURRENCY_SYMBOLS[input.currency]}/{input.priceUnit}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
