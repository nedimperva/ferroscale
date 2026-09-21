// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjects } from "@/hooks/useProjects";
import { libraryAssembly } from "@/test/library-fixtures";
import { calculateMetal, type CalculationInput } from "@ferroscale/metal-core";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { extractProjectCutGroups } from "@/lib/projects/cutting";

/** A tread: a plate, two brackets and a nosing bar, plus what it costs to make. */
const STAIR_TREAD = libraryAssembly(
  "asm-stair-tread",
  "Stair Step Tread (900mm)",
  [
    ["plt280x900x4 x1 s235", 1, "Tread step plate"],
    ["l50x50x5 280mm x2 s235", 2, "Side fixing brackets"],
    ["flt40x5 900mm x1 s235", 1, "Front nosing bar"],
  ],
  {
    category: "stairs_railings",
    laborHours: 0.35,
    additionalCosts: [
      { id: "cost-tread-bolts", label: "4x M12 Hex Bolts & Washers", amount: 3.2, category: "hardware" },
    ],
  },
);

const RAILING_POST = libraryAssembly(
  "asm-railing-post",
  "Railing Post & Base Flange (1m)",
  [
    ["shs40x40x3 1m x1 s235", 1, "Main post column"],
    ["plt120x120x10 x1 s235", 1, "Base anchor flange"],
    ["plt40x40x3 x1 s235", 1, "Top cap plate"],
  ],
  { category: "stairs_railings", laborHours: 0.25 },
);

const FENCE_PANEL = libraryAssembly(
  "asm-fence-panel",
  "Industrial Fence Panel (2.5m)",
  [
    ["rhs50x30x2 2.5m x2 s235", 2, "Top & bottom horizontal rails"],
    ["chs20x2 1.2m x20 s235", 20, "Vertical round tubes"],
  ],
  { category: "gates_fences", laborHours: 1.2 },
);

describe("Library assemblies inserted into a project", () => {
  it("inserts a template with multiplier into a project and scales all constituent cuts, labor, and costs", () => {
    const { result } = renderHook(() => useProjects());

    let projectId = "";
    act(() => {
      const p = result.current.createProject("Industrial Staircase Job");
      projectId = p.id;
    });

    const stairTread = STAIR_TREAD;

    // Insert 15x Stair Step Treads into the project
    act(() => {
      const ok = result.current.insertAssembly(
        projectId,
        stairTread,
        15,
        "Stair Treads",
      );
      expect(ok).toBe(true);
    });

    const project = result.current.projects.find((p) => p.id === projectId)!;
    expect(project).toBeDefined();
    expect(project.calculations.length).toBe(3); // 3 distinct profile types

    // Check scaled quantities
    const plateItem = project.calculations.find(
      (c) =>
        c.result.profileLabel.toLowerCase().includes("sheet") ||
        c.result.profileLabel.toLowerCase().includes("plate") ||
        c.result.profileLabel.includes("280"),
    )!;
    expect(plateItem).toBeDefined();
    expect(plateItem.input.quantity).toBe(15);
    expect(plateItem.assembly).toBe("Stair Treads");

    const angleItem = project.calculations.find(
      (c) =>
        c.result.profileLabel.toLowerCase().includes("angle") ||
        c.result.profileLabel.includes("50") ||
        c.result.profileLabel.includes("L50"),
    )!;
    expect(angleItem).toBeDefined();
    expect(angleItem.input.quantity).toBe(30); // 2 per unit * 15 = 30
    expect(angleItem.assembly).toBe("Stair Treads");

    // Check scaled labor hours
    expect(project.laborHours).toBeCloseTo(0.35 * 15, 2);

    // Check scaled additional costs (bolts)
    expect(project.additionalCosts?.length).toBe(1);
    expect(project.additionalCosts?.[0].amount).toBeCloseTo(3.2 * 15, 2);
  });

  it("scales an existing sub-assembly in place with a multiplier", () => {
    const { result } = renderHook(() => useProjects());

    let projectId = "";
    act(() => {
      const p = result.current.createProject("Canopy Frame");
      projectId = p.id;
    });

    const railingPost = RAILING_POST;

    // Insert 4x Posts
    act(() => {
      result.current.insertAssembly(projectId, railingPost, 4, "Columns");
    });

    let project = result.current.projects.find((p) => p.id === projectId)!;
    const postItem = project.calculations.find((c) => c.input.profileId === "square_hollow")!;
    expect(postItem).toBeDefined();
    expect(postItem.input.quantity).toBe(4);

    // Now scale the "Columns" sub-assembly by x2 (double to 8)
    act(() => {
      const ok = result.current.scaleSubAssembly(projectId, "Columns", 2);
      expect(ok).toBe(true);
    });

    project = result.current.projects.find((p) => p.id === projectId)!;
    const scaledPostItem = project.calculations.find((c) => c.input.profileId === "square_hollow")!;
    expect(scaledPostItem.input.quantity).toBe(8);

    const basePlateItem = project.calculations.find((c) => c.input.profileId === "plate" || c.input.profileId === "sheet")!;
    expect(basePlateItem.input.quantity).toBe(8);
  });

  it("creates a new project directly from a fabrication template", () => {
    const { result } = renderHook(() => useProjects());

    const fencePanel = FENCE_PANEL;

    let newProjId = "";
    act(() => {
      const p = result.current.createProjectFromAssembly("Warehouse Perimeter Fence", fencePanel, 5);
      newProjId = p.id;
    });

    const project = result.current.projects.find((p) => p.id === newProjId)!;
    expect(project).toBeDefined();
    expect(project.name).toBe("Warehouse Perimeter Fence");
    expect(project.calculations.length).toBe(2);

    const tubes = project.calculations.find((c) => c.input.profileId === "pipe")!;
    expect(tubes).toBeDefined();
    expect(tubes.input.quantity).toBe(100); // 20 * 5 = 100
    expect(project.laborHours).toBeCloseTo(1.2 * 5, 2);
  });

  it("scales a composite calculation with templateParts preserving piece lengths and updating piece counts", () => {
    // A composite row — one project item holding its parts inside it — is the
    // shape an older version wrote when an assembly was added from the
    // library. Nothing creates one now, so this seeds it the way it would be
    // read off disk: the point is that scaling still handles it.
    const part1Input: CalculationInput = {
      useCustomDensity: false,
      rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
      profileId: "angle",
      materialGradeId: "steel-s235jr",
      manualDimensions: {
        legA: { value: 50, unit: "mm" },
        legB: { value: 50, unit: "mm" },
        thickness: { value: 5, unit: "mm" },
      },
      length: { value: 1200, unit: "mm" },
      quantity: 2,
      priceBasis: "weight",
      priceUnit: "kg",
      unitPrice: 2,
      currency: "EUR",
      wastePercent: 0,
      includeVat: false,
      vatPercent: 0,
    };
    const part1Res = calculateMetal(part1Input);

    const part2Input: CalculationInput = {
      useCustomDensity: false,
      rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
      profileId: "flat_bar",
      materialGradeId: "steel-s235jr",
      manualDimensions: {
        width: { value: 40, unit: "mm" },
        thickness: { value: 5, unit: "mm" },
      },
      length: { value: 600, unit: "mm" },
      quantity: 4,
      priceBasis: "weight",
      priceUnit: "kg",
      unitPrice: 2,
      currency: "EUR",
      wastePercent: 0,
      includeVat: false,
      vatPercent: 0,
    };
    const part2Res = calculateMetal(part2Input);
    expect(part1Res.ok).toBe(true);
    expect(part2Res.ok).toBe(true);
    if (!part1Res.ok || !part2Res.ok) throw new Error("Calculation failed");

    const now = new Date().toISOString();
    const projectId = "composite-project";
    localStorage.setItem(
      "ferroscale-projects-v2",
      JSON.stringify([
        {
          id: projectId,
          name: "Composite Assembly Test",
          createdAt: now,
          updatedAt: now,
          calculations: [
            {
              id: "composite-1",
              timestamp: now,
              input: part1Input,
              result: part1Res.result,
              normalizedProfile: normalizeProfileSnapshot(part1Input),
              templateName: "Custom Truss",
              quantityMultiplier: 1,
              templateParts: [
                {
                  id: "p1",
                  name: "Angle Chords",
                  input: part1Input,
                  result: part1Res.result,
                  normalizedProfile: normalizeProfileSnapshot(part1Input),
                },
                {
                  id: "p2",
                  name: "Flat Web",
                  input: part2Input,
                  result: part2Res.result,
                  normalizedProfile: normalizeProfileSnapshot(part2Input),
                },
              ],
            },
          ],
        },
      ]),
    );

    const { result } = renderHook(() => useProjects());
    let project = result.current.projects.find((p) => p.id === projectId)!;
    expect(project.calculations.length).toBe(1);
    const trussCalc = project.calculations[0];
    expect(trussCalc.templateParts?.length).toBe(2);

    // Tag the composite calculation with an assembly label
    act(() => {
      result.current.updateItemAssembly(projectId, trussCalc.id, "Roof Trusses");
    });

    // Scale sub-assembly "Roof Trusses" by 3x
    act(() => {
      const scaled = result.current.scaleSubAssembly(projectId, "Roof Trusses", 3);
      expect(scaled).toBe(true);
    });

    project = result.current.projects.find((p) => p.id === projectId)!;
    const scaledCalc = project.calculations[0];
    expect(scaledCalc.quantityMultiplier).toBe(3);
    expect(scaledCalc.templateParts?.length).toBe(2);

    const scaledPart1 = scaledCalc.templateParts![0];
    const scaledPart2 = scaledCalc.templateParts![1];

    // Quantities scaled: 2 * 3 = 6, 4 * 3 = 12
    expect(scaledPart1.input.quantity).toBe(6);
    expect(scaledPart2.input.quantity).toBe(12);

    // Lengths MUST remain invariant: 1200mm and 600mm (NOT 3600mm or 1800mm)
    expect(scaledPart1.input.length.value).toBe(1200);
    expect(scaledPart2.input.length.value).toBe(600);

    // Weights must be ~3x original
    expect(scaledPart1.result.totalWeightKg).toBeCloseTo(part1Res.result!.totalWeightKg * 3, 1);
    expect(scaledPart2.result.totalWeightKg).toBeCloseTo(part2Res.result!.totalWeightKg * 3, 1);

    // Verify cut list piece extraction
    const groups = extractProjectCutGroups(project);
    expect(groups.length).toBe(2);

    const angleGroup = groups.find((g) => g.label.includes("Angle 50x50x5"))!;
    expect(angleGroup).toBeDefined();
    expect(angleGroup.totalPieces).toBe(6);
    expect(angleGroup.pieces[0].lengthMm).toBe(1200);
    expect(angleGroup.pieces[0].quantity).toBe(6);

    const flatGroup = groups.find((g) => g.label.includes("Flat Bar 40x5"))!;
    expect(flatGroup).toBeDefined();
    expect(flatGroup.totalPieces).toBe(12);
    expect(flatGroup.pieces[0].lengthMm).toBe(600);
    expect(flatGroup.pieces[0].quantity).toBe(12);
  });
});

