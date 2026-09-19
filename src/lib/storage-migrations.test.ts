// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { migrateLegacyStorageKeys } from "./storage-migrations";

const TEMPLATES_KEY = "ferroscale-assembly-templates-v1";
const SAVED_KEY = "ferroscale-saved-v2";

function legacyTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl-1",
    name: "Gate frame",
    description: "Two posts and a rail",
    category: "gates_fences",
    laborHours: 1.5,
    additionalCosts: [{ id: "c1", label: "Hinges", amount: 12, category: "hardware" }],
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
    items: [
      {
        id: "i1",
        input: { profileId: "square_hollow", quantity: 2 },
        result: { profileLabel: "SHS 40x40x3" },
        normalizedProfile: { shortLabel: "SHS 40x40x3" },
        quantity: 2,
        note: "Posts",
      },
    ],
    ...overrides,
  };
}

describe("folding assembly templates into the library", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("turns a template into a library entry and drops the old key", () => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify([legacyTemplate()]));

    migrateLegacyStorageKeys();

    expect(localStorage.getItem(TEMPLATES_KEY)).toBeNull();
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY)!);
    expect(saved).toHaveLength(1);
    const [entry] = saved;
    expect(entry.id).toBe("tpl-1");
    expect(entry.name).toBe("Gate frame");
    // The description becomes the entry's notes — the field already existed.
    expect(entry.notes).toBe("Two posts and a rail");
    expect(entry.category).toBe("gates_fences");
    expect(entry.laborHours).toBe(1.5);
    expect(entry.additionalCosts).toHaveLength(1);
    // A template is an assembly whatever its part count.
    expect(entry.isAssembly).toBe(true);
    // An item's note is the part's name.
    expect(entry.parts[0].name).toBe("Posts");
    expect(entry.parts[0].input.quantity).toBe(2);
    // The head fields mirror the first part, as every saved entry's do.
    expect(entry.input).toEqual(entry.parts[0].input);
  });

  it("keeps entries already in the library and never overwrites a matching id", () => {
    localStorage.setItem(
      SAVED_KEY,
      JSON.stringify([{ id: "tpl-1", name: "Mine", parts: [] }, { id: "other", name: "Other" }]),
    );
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify([legacyTemplate()]));

    migrateLegacyStorageKeys();

    const saved = JSON.parse(localStorage.getItem(SAVED_KEY)!);
    expect(saved).toHaveLength(2);
    expect(saved.find((e: { id: string }) => e.id === "tpl-1").name).toBe("Mine");
  });

  it("skips a template with nothing to calculate, and still drops the key", () => {
    localStorage.setItem(
      TEMPLATES_KEY,
      JSON.stringify([legacyTemplate({ items: [] }), legacyTemplate({ id: "t2", items: [{}] })]),
    );

    migrateLegacyStorageKeys();

    expect(localStorage.getItem(TEMPLATES_KEY)).toBeNull();
    expect(localStorage.getItem(SAVED_KEY)).toBeNull();
  });

  it("survives unparseable stored templates", () => {
    localStorage.setItem(TEMPLATES_KEY, "{not json");
    expect(() => migrateLegacyStorageKeys()).not.toThrow();
    expect(localStorage.getItem(TEMPLATES_KEY)).toBeNull();
  });

  it("clears the dead presets key", () => {
    localStorage.setItem("ferroscale-presets-v1", "[]");
    migrateLegacyStorageKeys();
    expect(localStorage.getItem("ferroscale-presets-v1")).toBeNull();
  });
});
