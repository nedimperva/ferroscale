// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCustomers } from "./useCustomers";
import { useProjects } from "./useProjects";
import { useCustomerLinking } from "@/components/command/customers/use-customer-linking";
import { customerIdForName } from "@/lib/customers/link";
import { loadCustomers, loadProjects, normalizeProject } from "@/lib/sync/collections";
import { SYNC_STORAGE_KEYS } from "@/lib/sync/keys";

function useBoth() {
  const projectsApi = useProjects();
  const customersApi = useCustomers();
  useCustomerLinking(projectsApi, customersApi);
  return { projectsApi, customersApi };
}

describe("useCustomers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates, edits, archives and deletes, and survives a reload", () => {
    const { result, unmount } = renderHook(() => useCustomers());
    let id = "";
    act(() => {
      id = result.current.createCustomer({ name: "  Marko Group ", phone: " +387 61 555 012 " }).id;
    });
    act(() => result.current.updateCustomer(id, { contact: "Marko Jurić", marginPercent: 14, name: "" }));
    act(() => result.current.setCustomerArchived(id, true));

    expect(result.current.customers[0]).toMatchObject({
      name: "Marko Group",
      phone: "+387 61 555 012",
      contact: "Marko Jurić",
      marginPercent: 14,
    });
    expect(result.current.customers[0].archivedAt).toBeTruthy();
    unmount();

    // A reload goes through normalizeCustomer — every field must survive it.
    const reloaded = renderHook(() => useCustomers());
    expect(reloaded.result.current.customers[0]).toMatchObject({
      contact: "Marko Jurić",
      marginPercent: 14,
    });

    act(() => reloaded.result.current.updateCustomer(id, { marginPercent: null }));
    expect(reloaded.result.current.customers[0]).not.toHaveProperty("marginPercent");

    act(() => reloaded.result.current.deleteCustomer(id));
    expect(reloaded.result.current.customers).toEqual([]);
    expect(loadCustomers()[0].deletedAt).toBeTruthy();
  });
});

describe("client → customer migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("turns existing free-text clients into linked customers on load", () => {
    const stamp = "2026-01-01T00:00:00.000Z";
    localStorage.setItem(
      SYNC_STORAGE_KEYS.projects,
      JSON.stringify([
        { id: "p1", name: "Gate", client: "Hadžić", createdAt: stamp, updatedAt: stamp, calculations: [] },
        { id: "p2", name: "Fence", client: "hadžić ", createdAt: stamp, updatedAt: stamp, calculations: [] },
        { id: "p3", name: "Shelf", createdAt: stamp, updatedAt: stamp, calculations: [] },
      ]),
    );

    const { result } = renderHook(() => useBoth());

    const id = customerIdForName("Hadžić");
    expect(result.current.customersApi.customers.map((c) => [c.id, c.name])).toEqual([[id, "Hadžić"]]);
    const byId = Object.fromEntries(result.current.projectsApi.projects.map((p) => [p.id, p]));
    expect(byId.p1.customerId).toBe(id);
    expect(byId.p2.customerId).toBe(id);
    expect(byId.p3.customerId).toBeUndefined();
    // Housekeeping, not an edit: the stamp stays, so it never wins a merge.
    expect(byId.p1.updatedAt).toBe(stamp);
    expect(loadProjects().find((p) => p.id === "p1")?.customerId).toBe(id);
  });

  it("relinks by name when a client is typed, and keeps an explicit link", () => {
    const { result } = renderHook(() => useBoth());
    let projectId = "";
    act(() => {
      projectId = result.current.projectsApi.createProject("Railing").id;
    });
    act(() => result.current.projectsApi.updateProjectMeta(projectId, { client: "Kovač" }));
    const auto = result.current.projectsApi.projects[0].customerId;
    expect(auto).toBe(customerIdForName("Kovač"));

    let explicit = "";
    act(() => {
      explicit = result.current.customersApi.createCustomer({ name: "Delić Trans" }).id;
    });
    act(() =>
      result.current.projectsApi.updateProjectMeta(projectId, { client: "Delić Trans", customerId: explicit }),
    );
    expect(result.current.projectsApi.projects[0]).toMatchObject({ client: "Delić Trans", customerId: explicit });
  });

  it("rewrites the stored client name when a customer is renamed", () => {
    const { result } = renderHook(() => useBoth());
    let projectId = "";
    act(() => {
      projectId = result.current.projectsApi.createProject("Railing").id;
    });
    act(() => result.current.projectsApi.updateProjectMeta(projectId, { client: "Kovac" }));
    const customerId = result.current.projectsApi.projects[0].customerId!;
    act(() => {
      result.current.customersApi.updateCustomer(customerId, { name: "Kovač d.o.o." });
      result.current.projectsApi.renameCustomerOnProjects(customerId, "Kovač d.o.o.");
    });
    expect(result.current.projectsApi.projects[0]).toMatchObject({ client: "Kovač d.o.o.", customerId });
    expect(result.current.customersApi.customers).toHaveLength(1);
  });
});

describe("normalizeProject", () => {
  it("keeps customerId through a reload", () => {
    const stamp = "2026-01-01T00:00:00.000Z";
    const project = normalizeProject({
      id: "p1",
      name: "Gate",
      client: "Hadžić",
      customerId: " cust-1 ",
      createdAt: stamp,
      updatedAt: stamp,
      calculations: [],
    });
    expect(project?.customerId).toBe("cust-1");
  });
});
