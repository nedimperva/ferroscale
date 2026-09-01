// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjects } from "@/hooks/useProjects";
import { getBuiltinAssemblyTemplates } from "@/hooks/useAssemblyTemplates";

describe("Project Assembly Templates and Multipliers", () => {
  it("inserts a template with multiplier into a project and scales all constituent cuts, labor, and costs", () => {
    const { result } = renderHook(() => useProjects());

    let projectId = "";
    act(() => {
      const p = result.current.createProject("Industrial Staircase Job");
      projectId = p.id;
    });

    const stairTreadTemplate = getBuiltinAssemblyTemplates().find((t) => t.id === "builtin-stair-tread")!;
    expect(stairTreadTemplate).toBeDefined();

    // Insert 15x Stair Step Treads into the project
    act(() => {
      const ok = result.current.insertAssemblyTemplate(
        projectId,
        stairTreadTemplate,
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

    const postTemplate = getBuiltinAssemblyTemplates().find((t) => t.id === "builtin-railing-post")!;

    // Insert 4x Posts
    act(() => {
      result.current.insertAssemblyTemplate(projectId, postTemplate, 4, "Columns");
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

    const fenceTemplate = getBuiltinAssemblyTemplates().find((t) => t.id === "builtin-fence-panel")!;

    let newProjId = "";
    act(() => {
      const p = result.current.createProjectFromTemplate("Warehouse Perimeter Fence", fenceTemplate, 5);
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
});
