// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { getBuiltinAssemblyTemplates, useAssemblyTemplates } from "./useAssemblyTemplates";

describe("useAssemblyTemplates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides built-in standard fabrication templates", () => {
    const builtins = getBuiltinAssemblyTemplates();
    expect(builtins.length).toBeGreaterThanOrEqual(4);

    const stairTread = builtins.find((b) => b.id === "builtin-stair-tread");
    expect(stairTread).toBeDefined();
    expect(stairTread?.items.length).toBe(3);
    expect(stairTread?.items.some((i) => i.result.profileLabel.toLowerCase().includes("sheet") || i.result.profileLabel.toLowerCase().includes("plate") || i.result.profileLabel.includes("280"))).toBe(true);

    const post = builtins.find((b) => b.id === "builtin-railing-post");
    expect(post).toBeDefined();
    expect(post?.items.length).toBe(3);
  });

  it("can save, update, and delete custom assembly templates", () => {
    const { result } = renderHook(() => useAssemblyTemplates());

    let createdId = "";
    act(() => {
      const saved = result.current.saveTemplate({
        name: "Custom Gate Hinge Post",
        description: "Heavy duty 80x80 post with welded hinge brackets",
        category: "gates_fences",
        items: [
          {
            id: "item-1",
            input: {
              profileId: "square_hollow",
              gradeId: "steel-s235jr",
              quantity: 1,
              lengthValue: 2000,
              lengthUnit: "mm",
              manualDimensions: {
                width: { value: 80, unit: "mm" },
                thickness: { value: 4, unit: "mm" },
              },
            },
            result: {
              profileLabel: "SHS 80x80x4",
              quantity: 1,
              unitWeightKg: 18.84,
              totalWeightKg: 18.84,
              unitPrice: 2.5,
              totalPrice: 47.1,
              subtotalAmount: 47.1,
              wasteAmount: 0,
              vatAmount: 0,
              grandTotalAmount: 47.1,
              priceUnit: "kg",
              currency: "EUR",
              gradeId: "steel-s235jr",
              gradeName: "S235JR",
              category: "square_hollow",
              surfaceAreaM2: 0.64,
            },
            normalizedProfile: {
              formatVersion: 1,
              iconKey: "square_hollow",
              shortLabel: "SHS 80x80x4",
              canonicalKey: "profile=square_hollow|len=2000|qty=1",
            },
            quantity: 1,
          },
        ],
        laborHours: 0.5,
      });
      createdId = saved.id;
    });

    expect(createdId).toBeTruthy();
    expect(result.current.templates.some((t) => t.id === createdId)).toBe(true);

    // Update template
    act(() => {
      result.current.updateTemplate(createdId, {
        name: "Renamed Gate Post",
      });
    });

    const updated = result.current.templates.find((t) => t.id === createdId);
    expect(updated?.name).toBe("Renamed Gate Post");

    // Delete template
    act(() => {
      result.current.deleteTemplate(createdId);
    });

    expect(result.current.templates.some((t) => t.id === createdId)).toBe(false);
  });
  it("removes a standard template and can put it back", () => {
    const { result } = renderHook(() => useAssemblyTemplates());
    const builtinCount = getBuiltinAssemblyTemplates().length;
    expect(result.current.templates).toHaveLength(builtinCount);

    act(() => {
      result.current.removeBuiltin("builtin-stair-tread");
    });

    expect(result.current.templates.some((t) => t.id === "builtin-stair-tread")).toBe(false);
    expect(result.current.templates).toHaveLength(builtinCount - 1);
    expect(result.current.removedBuiltins.map((t) => t.id)).toEqual(["builtin-stair-tread"]);
    // The tombstone must not leak into the user's own templates.
    expect(result.current.customTemplates).toHaveLength(0);

    act(() => {
      result.current.restoreBuiltin("builtin-stair-tread");
    });

    expect(result.current.templates.some((t) => t.id === "builtin-stair-tread")).toBe(true);
    expect(result.current.removedBuiltins).toHaveLength(0);
  });

  it("keeps a removed standard removed across a remount, and restores all at once", () => {
    const first = renderHook(() => useAssemblyTemplates());
    act(() => {
      first.result.current.removeBuiltin("builtin-fence-panel");
      first.result.current.removeBuiltin("builtin-beam-end-plates");
    });
    first.unmount();

    const second = renderHook(() => useAssemblyTemplates());
    expect(second.result.current.removedBuiltins.map((t) => t.id).sort()).toEqual([
      "builtin-beam-end-plates",
      "builtin-fence-panel",
    ]);

    act(() => {
      second.result.current.restoreAllBuiltins();
    });

    expect(second.result.current.removedBuiltins).toHaveLength(0);
    expect(second.result.current.templates).toHaveLength(getBuiltinAssemblyTemplates().length);
  });

  it("duplicates a standard into an editable copy with fresh ids", () => {
    const { result } = renderHook(() => useAssemblyTemplates());

    let copyId = "";
    act(() => {
      copyId = result.current.duplicateTemplate("builtin-stair-tread", "copy")?.id ?? "";
    });

    const source = getBuiltinAssemblyTemplates().find((t) => t.id === "builtin-stair-tread");
    const copy = result.current.customTemplates.find((t) => t.id === copyId);
    expect(copy).toBeDefined();
    expect(copy?.isBuiltin).toBeFalsy();
    expect(copy?.name).toBe(`${source?.name} (copy)`);
    expect(copy?.items).toHaveLength(source?.items.length ?? 0);
    // Items are cloned, not shared, so editing the copy cannot touch the standard.
    expect(copy?.items.map((i) => i.id)).not.toEqual(source?.items.map((i) => i.id));
    // Duplicating leaves the standard in place.
    expect(result.current.templates.some((t) => t.id === "builtin-stair-tread")).toBe(true);
  });

  it("ignores edits and deletes aimed at a standard", () => {
    const { result } = renderHook(() => useAssemblyTemplates());

    act(() => {
      result.current.updateTemplate("builtin-stair-tread", { name: "Hacked" });
      result.current.deleteTemplate("builtin-stair-tread");
    });

    const builtin = result.current.templates.find((t) => t.id === "builtin-stair-tread");
    expect(builtin?.name).toBe("Stair Step Tread (900mm)");
  });
  it("restores a soft-deleted custom template", () => {
    const { result } = renderHook(() => useAssemblyTemplates());

    let copyId = "";
    act(() => {
      copyId = result.current.duplicateTemplate("builtin-fence-panel", "copy")?.id ?? "";
    });

    act(() => {
      result.current.deleteTemplate(copyId);
    });
    expect(result.current.customTemplates.some((t) => t.id === copyId)).toBe(false);

    act(() => {
      result.current.restoreTemplate(copyId);
    });
    const restored = result.current.customTemplates.find((t) => t.id === copyId);
    expect(restored).toBeDefined();
    expect(restored?.deletedAt).toBeUndefined();
  });

  it("does not duplicate a write when the state updater runs twice", () => {
    // React StrictMode invokes state updaters twice; a write that reads storage
    // inside the updater would append the same template on each pass.
    const { result } = renderHook(() => useAssemblyTemplates());

    act(() => {
      result.current.duplicateTemplate("builtin-stair-tread", "copy");
    });

    expect(result.current.customTemplates).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("ferroscale-assembly-templates-v1") ?? "[]")).toHaveLength(1);
  });
});
