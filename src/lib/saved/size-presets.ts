import { manualDimensionsToMm, toMillimeters } from "@ferroscale/metal-core";
import type { CommandSizePreset } from "@ferroscale/metal-core";
import type { CalculationInput } from "@/lib/calculator/types";
import type { ProfileId } from "@/lib/datasets/types";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { SavedEntry } from "@/hooks/useSaved";

/**
 * Size chips used to come from a separate "presets" collection that had a
 * store and a sync slot but no UI. A saved part already is a size (plus a
 * grade and a length). This builds the suggestion callback from Parts, and
 * still folds in any leftover DimensionPreset records so an old synced
 * collection does not vanish.
 */

const MAX_PER_PROFILE = 6;

function inputToPreset(input: CalculationInput, label?: string): CommandSizePreset {
  return {
    label,
    selectedSizeId: input.selectedSizeId,
    manualDimensionsMm: manualDimensionsToMm(input.manualDimensions),
    lengthValue: toMillimeters(input.length.value, input.length.unit),
  };
}

function leftoverToPreset(preset: DimensionPreset): CommandSizePreset {
  return {
    label: preset.label,
    selectedSizeId: preset.selectedSizeId,
    manualDimensionsMm: preset.manualDimensionsMm,
    lengthValue: preset.lengthValue,
  };
}

function presetKey(preset: CommandSizePreset): string {
  if (preset.selectedSizeId) return `s:${preset.selectedSizeId}`;
  const dims = Object.entries(preset.manualDimensionsMm)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
  return `m:${dims}:l=${preset.lengthValue ?? ""}`;
}

function usedAt(entry: SavedEntry): number {
  const stamp = Date.parse(entry.lastUsedAt ?? entry.timestamp);
  return Number.isNaN(stamp) ? 0 : stamp;
}

/**
 * Ranked size lookup for `cmdSuggest`. Pinned parts first, then most used,
 * then leftover presets. Duplicates (same size id / same dims) collapse.
 */
export function buildSizePresetLookup(
  saved: SavedEntry[],
  leftover: DimensionPreset[] = [],
): (profileId: ProfileId) => CommandSizePreset[] {
  const ranked: Array<{ profileId: ProfileId; preset: CommandSizePreset }> = [];

  const ordered = [...saved].sort((left, right) => {
    if (left.pinned && !right.pinned) return -1;
    if (!left.pinned && right.pinned) return 1;
    return right.useCount - left.useCount || usedAt(right) - usedAt(left);
  });

  for (const entry of ordered) {
    const parts = entry.parts.length > 0 ? entry.parts : [{ input: entry.input, name: entry.name }];
    for (const part of parts) {
      if (!part.input?.profileId) continue;
      ranked.push({
        profileId: part.input.profileId,
        preset: inputToPreset(
          part.input,
          entry.parts.length > 1 ? part.name : entry.name,
        ),
      });
    }
  }

  for (const preset of leftover) {
    ranked.push({
      profileId: preset.profileId,
      preset: leftoverToPreset(preset),
    });
  }

  const byProfile = new Map<ProfileId, CommandSizePreset[]>();
  const seen = new Map<ProfileId, Set<string>>();
  for (const item of ranked) {
    const keys = seen.get(item.profileId) ?? new Set<string>();
    const key = presetKey(item.preset);
    if (keys.has(key)) continue;
    const list = byProfile.get(item.profileId) ?? [];
    if (list.length >= MAX_PER_PROFILE) continue;
    keys.add(key);
    seen.set(item.profileId, keys);
    list.push(item.preset);
    byProfile.set(item.profileId, list);
  }

  return (profileId) => byProfile.get(profileId) ?? [];
}
