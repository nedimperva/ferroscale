import { memo, useMemo } from "react";
import type { CalculationInput, LengthUnit, ValidationIssue } from "@/lib/calculator/types";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import type { ProfileCategory, ProfileDefinition, ProfileId } from "@/lib/datasets/types";
import { PROFILE_CATEGORY_LABELS } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { parseNumber } from "@/hooks/useCalculator";
import { DimensionInput } from "./dimension-input";

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

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

/** Short label for the sub-type pills (cleaner than full profile label). */
const PROFILE_SHORT_LABELS: Partial<Record<ProfileId, string>> = {
  pipe: "Circular",
  rectangular_tube: "Rectangular",
  square_hollow: "Square",
  round_bar: "Round",
  square_bar: "Square",
  flat_bar: "Flat",
  sheet: "Sheet",
  plate: "Plate",
  chequered_plate: "Chequered",
  expanded_metal: "Expanded",
  corrugated_sheet: "Corrugated",
  beam_ipe_en: "IPE",
  beam_ipn_en: "IPN",
  beam_hea_en: "HEA",
  beam_heb_en: "HEB",
  beam_hem_en: "HEM",
  channel_upn_en: "UPN",
  channel_upe_en: "UPE",
  angle_equal_en: "Angle (L)",
  tee_en: "Tee (T)",
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
  angle_equal_en: (
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
}

export const ProfileSection = memo(function ProfileSection({
  input,
  dispatch,
  selectedProfile,
  issues,
}: ProfileSectionProps) {
  const hasIssue = (field: string) => issues.some((i) => i.field === field);
  const grouped = useMemo(() => groupByCategory(PROFILE_DEFINITIONS), []);

  const activeCategory = selectedProfile.category;
  const categoryProfiles = useMemo(
    () => grouped.get(activeCategory) ?? [],
    [grouped, activeCategory],
  );

  /** Switch to a different category — auto-select its first profile. */
  const handleCategoryChange = (cat: ProfileCategory) => {
    if (cat === activeCategory) return;
    const profiles = grouped.get(cat);
    if (profiles?.[0]) {
      dispatch({ type: "SET_PROFILE", profileId: profiles[0].id });
    }
  };

  return (
    <section className="grid gap-4">
      {/* ── Tier 1: Category pills ── */}
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-slate-500">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ORDER.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {CATEGORY_ICONS[cat]}
                {PROFILE_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tier 2: Sub-type pills ── */}
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-slate-500">Type</span>
        <div className="flex flex-wrap gap-1.5">
          {categoryProfiles.map((p) => {
            const isActive = p.id === input.profileId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => dispatch({ type: "SET_PROFILE", profileId: p.id })}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {PROFILE_ICONS[p.id]}
                {PROFILE_SHORT_LABELS[p.id] ?? p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Standard profile: size dropdown ── */}
      {selectedProfile.mode === "standard" && (
        <div className="grid gap-1">
          <label htmlFor="size" className="text-xs font-medium text-slate-600">
            Size
          </label>
          <select
            id="size"
            value={input.selectedSizeId ?? selectedProfile.sizes[0]?.id}
            onChange={(e) => dispatch({ type: "SET_SIZE", sizeId: e.target.value })}
            className={`h-9 rounded-lg border bg-white px-2 text-sm transition-colors focus:border-accent ${
              hasIssue("selectedSizeId") ? "border-red-400" : "border-slate-300"
            }`}
          >
            {selectedProfile.sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Area from EN table · {selectedProfile.formulaLabel}
          </p>
        </div>
      )}

      {/* ── Manual dimensions ── */}
      {selectedProfile.mode === "manual" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {selectedProfile.dimensions.map((dim) => (
            <DimensionInput
              key={dim.key}
              dimension={dim}
              value={input.manualDimensions[dim.key]}
              onValueChange={(v) =>
                dispatch({ type: "SET_DIMENSION_VALUE", key: dim.key, value: v })
              }
              onUnitChange={(u) =>
                dispatch({ type: "SET_DIMENSION_UNIT", key: dim.key, unit: u })
              }
            />
          ))}
        </div>
      )}

      {/* ── Length + Quantity ── */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="length" className="text-xs font-medium text-slate-600">
            Piece length
          </label>
          <div className="flex gap-1">
            <input
              id="length"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              min={0}
              step="any"
              value={input.length.value}
              onChange={(e) =>
                dispatch({ type: "SET_LENGTH_VALUE", value: parseNumber(e.target.value) })
              }
              className={`h-9 w-full rounded-lg border bg-white px-2 text-sm transition-colors focus:border-accent ${
                hasIssue("length") ? "border-red-400" : "border-slate-300"
              }`}
            />
            <select
              value={input.length.unit}
              onChange={(e) =>
                dispatch({ type: "SET_LENGTH_UNIT", unit: e.target.value as LengthUnit })
              }
              className="h-9 rounded-lg border border-slate-300 bg-white px-1 text-sm transition-colors focus:border-accent"
              aria-label="Length unit"
            >
              {LENGTH_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-1">
          <label htmlFor="quantity" className="text-xs font-medium text-slate-600">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={1}
            step={1}
            value={input.quantity}
            onChange={(e) =>
              dispatch({ type: "SET_QUANTITY", value: parseNumber(e.target.value) })
            }
            className={`h-9 rounded-lg border bg-white px-2 text-sm transition-colors focus:border-accent ${
              hasIssue("quantity") ? "border-red-400" : "border-slate-300"
            }`}
          />
        </div>
      </div>
    </section>
  );
});
