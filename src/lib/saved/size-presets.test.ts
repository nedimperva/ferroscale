import { describe, expect, it } from "vitest";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { SavedEntry, TemplatePart } from "@/hooks/useSaved";
import { getDefaultInput } from "@/lib/calculator/input-storage";
import { buildSizePresetLookup } from "./size-presets";

function part(profileId: SavedEntry["input"]["profileId"], sizeId: string, name: string): TemplatePart {
  const input = {
    ...getDefaultInput(),
    profileId,
    selectedSizeId: sizeId,
    manualDimensions: {},
  };
  return {
    id: sizeId,
    name,
    input,
    result: { profileLabel: name } as TemplatePart["result"],
    normalizedProfile: { shortLabel: name } as TemplatePart["normalizedProfile"],
  };
}

function saved(overrides: Partial<SavedEntry> & { parts: TemplatePart[] }): SavedEntry {
  const first = overrides.parts[0];
  return {
    id: overrides.id ?? "s1",
    timestamp: overrides.timestamp ?? "2026-08-01T00:00:00.000Z",
    name: overrides.name ?? first?.name ?? "Part",
    pinned: overrides.pinned,
    useCount: overrides.useCount ?? 0,
    lastUsedAt: overrides.lastUsedAt,
    updatedAt: overrides.timestamp ?? "2026-08-01T00:00:00.000Z",
    parts: overrides.parts,
    input: first!.input,
    result: first!.result,
    normalizedProfile: first!.normalizedProfile,
  };
}

describe("buildSizePresetLookup", () => {
  it("ranks pinned parts first and dedupes the same size", () => {
    const lookup = buildSizePresetLookup([
      saved({
        id: "used",
        name: "Everyday HEA 200",
        useCount: 9,
        parts: [part("beam_hea_en", "hea200", "HEA 200")],
      }),
      saved({
        id: "pin",
        name: "Pinned HEA 120",
        pinned: true,
        useCount: 1,
        parts: [part("beam_hea_en", "hea120", "HEA 120")],
      }),
      saved({
        id: "dup",
        name: "Also HEA 120",
        useCount: 4,
        parts: [part("beam_hea_en", "hea120", "HEA 120 again")],
      }),
    ]);

    const hea = lookup("beam_hea_en");
    expect(hea.map((preset) => preset.selectedSizeId)).toEqual(["hea120", "hea200"]);
    expect(hea[0]?.label).toBe("Pinned HEA 120");
  });

  it("exposes every part of an assembly under its own profile", () => {
    const lookup = buildSizePresetLookup([
      saved({
        name: "Gate",
        parts: [
          part("beam_hea_en", "hea120", "Post"),
          part("beam_ipe_en", "ipe200", "Rail"),
        ],
      }),
    ]);

    expect(lookup("beam_hea_en")[0]).toMatchObject({ selectedSizeId: "hea120", label: "Post" });
    expect(lookup("beam_ipe_en")[0]).toMatchObject({ selectedSizeId: "ipe200", label: "Rail" });
  });

  it("keeps leftover dimension presets after parts", () => {
    const leftover: DimensionPreset[] = [
      {
        id: "old",
        profileId: "square_hollow",
        label: "Old shop size",
        manualDimensionsMm: { side: 45, wallThickness: 4 },
        createdAt: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const lookup = buildSizePresetLookup([], leftover);
    expect(lookup("square_hollow")[0]).toMatchObject({
      label: "Old shop size",
      manualDimensionsMm: { side: 45, wallThickness: 4 },
    });
  });
});
