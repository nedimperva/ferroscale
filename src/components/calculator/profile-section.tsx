import { memo, useMemo } from "react";
import type { CalculationInput, LengthUnit, ValidationIssue } from "@/lib/calculator/types";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import type { ProfileCategory, ProfileDefinition, ProfileId } from "@/lib/datasets/types";
import { PROFILE_CATEGORY_LABELS } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { parseNumber } from "@/hooks/useCalculator";
import { DimensionInput } from "./dimension-input";

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

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

  return (
    <section className="grid gap-3">
      {/* ── Row 1: Profile type + Size (standard) ── */}
      <div className={`grid gap-2 ${selectedProfile.mode === "standard" ? "sm:grid-cols-2" : ""}`}>
        <div className="grid gap-1">
          <label htmlFor="profile" className="text-xs font-medium text-slate-600">
            Profile type
          </label>
          <select
            id="profile"
            value={input.profileId}
            onChange={(e) =>
              dispatch({ type: "SET_PROFILE", profileId: e.target.value as ProfileId })
            }
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm transition-colors focus:border-accent"
          >
            {[...grouped.entries()].map(([category, profiles]) => (
              <optgroup key={category} label={PROFILE_CATEGORY_LABELS[category]}>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

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
      </div>

      {/* ── Row 2: Manual dimensions (manual mode only) ── */}
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

      {/* ── Row 3: Length + Quantity ── */}
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
