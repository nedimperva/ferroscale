import { describe, expect, it } from "vitest";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { customerStats, filterCustomers, findCustomerByName } from "./query";

const STAMP = "2026-01-01T00:00:00.000Z";

function job(id: string, extra: Partial<Project> & { cost?: number } = {}): Project {
  const { cost = 0, ...rest } = extra;
  return {
    id,
    name: id,
    customerId: "c1",
    createdAt: STAMP,
    updatedAt: STAMP,
    calculations: cost
      ? [
          {
            id: `${id}-calc`,
            createdAt: STAMP,
            input: { quantity: 1 } as unknown as CalculationInput,
            result: {
              profileLabel: "SHS",
              quantity: 1,
              unitWeightKg: 10,
              totalWeightKg: 10,
              grandTotalAmount: cost,
              currency: "EUR",
            } as unknown as CalculationResult,
          } as unknown as Project["calculations"][number],
        ]
      : [],
    ...rest,
  };
}

function customer(id: string, name: string, extra: Partial<Customer> = {}): Customer {
  return { id, name, createdAt: STAMP, updatedAt: STAMP, ...extra };
}

describe("customerStats", () => {
  it("sums every job for lifetime and only unfinished ones for open", () => {
    const projects = [
      job("open", { cost: 100, marginPercent: 10 }),
      job("done", { cost: 200, status: "done" }),
      job("late", { cost: 50, dueDate: "2000-01-01" }),
      job("other", { cost: 999, customerId: "c2" }),
      job("gone", { cost: 999, deletedAt: STAMP }),
    ];
    const stats = customerStats("c1", projects, 0);
    expect(stats.jobs.map((p) => p.id).sort()).toEqual(["done", "late", "open"]);
    expect(stats.openJobs.map((p) => p.id).sort()).toEqual(["late", "open"]);
    expect(stats.lifetimeValue).toBe(110 + 200 + 50);
    expect(stats.openValue).toBe(110 + 50);
    expect(stats.overdueCount).toBe(1);
  });

  it("applies the shop margin to jobs without their own", () => {
    expect(customerStats("c1", [job("a", { cost: 100 })], 20).lifetimeValue).toBe(120);
  });

  it("is all zeros for a customer with no jobs", () => {
    expect(customerStats("c1", [], 15)).toMatchObject({
      jobs: [],
      openJobs: [],
      lifetimeValue: 0,
      openValue: 0,
      overdueCount: 0,
    });
  });
});

describe("filterCustomers", () => {
  const customers = [
    customer("1", "kovač", { phone: "+387 63" }),
    customer("2", "Bosna Steel", { contact: "Amra Hodžić" }),
    customer("3", "Delić Trans", { archivedAt: STAMP }),
    customer("4", "Ghost", { deletedAt: STAMP }),
  ];

  it("lists active customers by name, case-insensitively", () => {
    expect(filterCustomers(customers).map((c) => c.name)).toEqual(["Bosna Steel", "kovač"]);
  });

  it("lists archived ones on their own", () => {
    expect(filterCustomers(customers, { archived: true }).map((c) => c.id)).toEqual(["3"]);
  });

  it("searches name, contact and phone", () => {
    expect(filterCustomers(customers, { search: "amra" }).map((c) => c.id)).toEqual(["2"]);
    expect(filterCustomers(customers, { search: "+387" }).map((c) => c.id)).toEqual(["1"]);
  });
});

describe("findCustomerByName", () => {
  it("matches regardless of case and spacing, and skips deleted rows", () => {
    const customers = [customer("1", "Ghost", { deletedAt: STAMP }), customer("2", "Marko Group")];
    expect(findCustomerByName(customers, " marko  group")?.id).toBe("2");
    expect(findCustomerByName(customers, "ghost")).toBeUndefined();
    expect(findCustomerByName(customers, "  ")).toBeUndefined();
  });
});
