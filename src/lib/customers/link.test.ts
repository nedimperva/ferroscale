import { describe, expect, it } from "vitest";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import { customerIdForName, customerNameKey, reconcileCustomerLinks } from "./link";

const NOW = "2026-10-08T12:00:00.000Z";

function project(id: string, client?: string, extra?: Partial<Project>): Project {
  return {
    id,
    name: `Job ${id}`,
    client,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    calculations: [],
    ...extra,
  };
}

function customer(id: string, name: string, extra?: Partial<Customer>): Customer {
  return { id, name, createdAt: NOW, updatedAt: NOW, ...extra };
}

describe("customerNameKey", () => {
  it("ignores case, outer and repeated spaces", () => {
    expect(customerNameKey("  Marko   Group ")).toBe(customerNameKey("marko group"));
  });

  it("treats composed and decomposed accents as one name", () => {
    expect(customerNameKey("Hadžić")).toBe(customerNameKey("Hadžić"));
  });
});

describe("customerIdForName", () => {
  it("is the same for the same name on any device", () => {
    expect(customerIdForName("Bosna Steel")).toBe(customerIdForName(" bosna  steel"));
    expect(customerIdForName("Bosna Steel")).toMatch(/^cust-[0-9a-f]{8}$/);
  });

  it("differs between names", () => {
    expect(customerIdForName("Kovač")).not.toBe(customerIdForName("Kovacs"));
  });
});

describe("reconcileCustomerLinks", () => {
  it("creates one customer per distinct client and links every job", () => {
    const projects = [
      project("p1", "Marko Group"),
      project("p2", "marko group "),
      project("p3", "Kovač"),
      project("p4"),
    ];
    const { created, links } = reconcileCustomerLinks(projects, [], NOW);

    expect(created.map((c) => c.name)).toEqual(["Marko Group", "Kovač"]);
    expect(created[0]).toEqual({
      id: customerIdForName("Marko Group"),
      name: "Marko Group",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(links).toEqual({
      p1: created[0].id,
      p2: created[0].id,
      p3: created[1].id,
    });
  });

  it("links to an existing customer of the same name instead of creating one", () => {
    const existing = customer("uuid-1", "Bosna Steel");
    const { created, links } = reconcileCustomerLinks([project("p1", "BOSNA STEEL")], [existing], NOW);
    expect(created).toEqual([]);
    expect(links).toEqual({ p1: "uuid-1" });
  });

  it("links to an archived customer too", () => {
    const archived = customer("uuid-2", "Delić Trans", { archivedAt: NOW });
    const { created, links } = reconcileCustomerLinks([project("p1", "Delić Trans")], [archived], NOW);
    expect(created).toEqual([]);
    expect(links).toEqual({ p1: "uuid-2" });
  });

  it("does not match a deleted customer by name, and recreates it under the derived id", () => {
    const gone = customer("uuid-3", "Hadžić", { deletedAt: NOW });
    const { created, links } = reconcileCustomerLinks([project("p1", "Hadžić")], [gone], NOW);
    expect(created.map((c) => c.id)).toEqual([customerIdForName("Hadžić")]);
    expect(links.p1).toBe(customerIdForName("Hadžić"));
  });

  it("leaves linked, unnamed and deleted projects alone", () => {
    const projects = [
      project("p1", "Marko", { customerId: "uuid-9" }),
      project("p2", "  "),
      project("p3", "Kovač", { deletedAt: NOW }),
    ];
    expect(reconcileCustomerLinks(projects, [], NOW)).toEqual({ created: [], links: {} });
  });

  it("finds nothing to do once its own result is applied", () => {
    const projects = [project("p1", "Marko"), project("p2", "Kovač")];
    const first = reconcileCustomerLinks(projects, [], NOW);
    const linked = projects.map((p) => ({ ...p, customerId: first.links[p.id] }));
    expect(reconcileCustomerLinks(linked, first.created, NOW)).toEqual({ created: [], links: {} });
  });
});
