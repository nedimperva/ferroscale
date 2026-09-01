// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { getBuiltinAssemblyTemplates, useAssemblyTemplates } from "./useAssemblyTemplates";

describe("useAssemblyTemplates", () => {
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
});
