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
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {/* bars icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
        Profile &amp; Geometry
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="profile" className="text-xs font-medium text-slate-700">
            Profile type
          </label>
          <select
            id="profile"
            value={input.profileId}
            onChange={(e) =>
              dispatch({ type: "SET_PROFILE", profileId: e.target.value as ProfileId })
            }
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
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
            <label htmlFor="size" className="text-xs font-medium text-slate-700">
              Size
            </label>
            <select
              id="size"
              value={input.selectedSizeId ?? selectedProfile.sizes[0]?.id}
              onChange={(e) => dispatch({ type: "SET_SIZE", sizeId: e.target.value })}
              className={`h-9 rounded-md border bg-white px-2 text-sm ${
                hasIssue("selectedSizeId") ? "border-red-400" : "border-slate-300"
              }`}
            >
              {selectedProfile.sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedProfile.mode === "manual" ? (
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
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          Area from EN table: {selectedProfile.formulaLabel}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="length" className="text-xs font-medium text-slate-700">
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
              className={`h-9 w-full rounded-md border bg-white px-2 text-sm ${
                hasIssue("length") ? "border-red-400" : "border-slate-300"
              }`}
            />
            <select
              value={input.length.unit}
              onChange={(e) =>
                dispatch({ type: "SET_LENGTH_UNIT", unit: e.target.value as LengthUnit })
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-1 text-sm"
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
          <label htmlFor="quantity" className="text-xs font-medium text-slate-700">
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
            className={`h-9 rounded-md border bg-white px-2 text-sm ${
              hasIssue("quantity") ? "border-red-400" : "border-slate-300"
            }`}
          />
        </div>
      </div>
    </section>
  );
});
