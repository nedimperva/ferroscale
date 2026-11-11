import { describe, expect, it } from "vitest";
import { normalizeSavedEntry } from "./collections";

const legacy = {
  id: "entry-1",
  timestamp: "2025-01-01T00:00:00.000Z",
  name: "HEA 120",
  input: { profileId: "beam_hea", quantity: 1 },
  result: { profileLabel: "HEA 120", totalWeightKg: 119.4 },
  normalizedProfile: { shortLabel: "HEA 120" },
};

describe("normalizeSavedEntry", () => {
  it("gives a legacy entry without parts the same part id on every load", () => {
    const first = normalizeSavedEntry(legacy);
    const second = normalizeSavedEntry(JSON.parse(JSON.stringify(legacy)));
    expect(first?.parts).toHaveLength(1);
    expect(first?.parts[0].id).toBe(second?.parts[0].id);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("keeps stored part ids and fills only the missing ones, stably", () => {
    const raw = {
      ...legacy,
      parts: [
        { id: "p-a", name: "A", input: legacy.input, result: legacy.result, normalizedProfile: legacy.normalizedProfile },
        { name: "B", input: legacy.input, result: legacy.result, normalizedProfile: legacy.normalizedProfile },
      ],
    };
    const first = normalizeSavedEntry(raw);
    const second = normalizeSavedEntry(raw);
    expect(first?.parts.map((p) => p.id)).toEqual(["p-a", second?.parts[1].id]);
    expect(first?.parts[1].id).toBe(second?.parts[1].id);
  });
});
