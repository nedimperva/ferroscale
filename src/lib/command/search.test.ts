import { describe, expect, it } from "vitest";
import type { CompareItem } from "@/hooks/useCompare";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput } from "@/lib/calculator/types";
import { searchEverything, type SearchInput, type SearchResults } from "./search";

const PART_OGRADA: SavedEntry = {
  id: "part-ograda",
  name: "Ograda 120",
  parts: [
    { id: "part-ograda-0", name: "Stub" },
    { id: "part-ograda-1", name: "Rama" },
  ],
  updatedAt: "2026-03-01T10:00:00.000Z",
} as unknown as SavedEntry;

const PART_NOSAC: SavedEntry = {
  id: "part-nosac",
  name: "Nosač",
  parts: [{ id: "part-nosac-0", name: "Čelični nosač" }],
  updatedAt: "2026-06-01T10:00:00.000Z",
} as unknown as SavedEntry;

const PROJECT_HALA: Project = {
  id: "proj-hala",
  name: "Hala Vogošća",
  client: "Bosna Gradnja",
  status: "draft",
  category: "structural",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  calculations: [],
} as unknown as Project;

const CUSTOMER_MEHMED: Customer = {
  id: "cust-mehmed",
  name: "Mehmed Hrvat",
  contact: "Mehmed",
  phone: "061 234 567",
  email: "mehmed@example.com",
  notes: "Račun na firmu",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
} as unknown as Customer;

const BEAM_INPUT: CalculationInput = {
  materialGradeId: "steel-s235jr",
  useCustomDensity: false,
  profileId: "beam_hea_en",
  selectedSizeId: "hea120",
  manualDimensions: {},
  length: { value: 6, unit: "m" },
  quantity: 2,
  priceBasis: "weight",
  priceUnit: "kg",
  unitPrice: 1.2,
  currency: "EUR",
  wastePercent: 0,
  includeVat: false,
  vatPercent: 0,
  rounding: { weightDecimals: 2, priceDecimals: 2, dimensionDecimals: 2 },
};

const INPUT: SearchInput = {
  lines: ["hea120 6m x2", "shs 40x40x3 6m", "UPN100 3m s355"],
  parts: [PART_OGRADA, PART_NOSAC],
  projects: [PROJECT_HALA],
  customers: [CUSTOMER_MEHMED],
  sizes: [{ label: "HEA 120", query: "hea120", detail: "EN 10365" }],
  settings: [{ label: "VAT rate", id: "settings.vat" }],
};

const labelsOf = (results: SearchResults): string[] => results.items.map((item) => item.label);
const idsOf = (results: SearchResults): string[] => results.items.map((item) => item.id);

describe("searchEverything", () => {
  it("returns nothing for an empty term", () => {
    expect(searchEverything(INPUT, "")).toEqual({ items: [], term: "" });
    expect(searchEverything(INPUT, "   ")).toEqual({ items: [], term: "" });
  });

  it("returns the term it searched, trimmed", () => {
    expect(searchEverything(INPUT, "  hea  ").term).toBe("hea");
  });

  it("matches a line whatever the case", () => {
    expect(labelsOf(searchEverything(INPUT, "HEA"))).toContain("hea120 6m x2");
    expect(labelsOf(searchEverything(INPUT, "upn"))).toContain("UPN100 3m s355");
  });

  it("needs every word of the term to match", () => {
    expect(searchEverything(INPUT, "hea120 zid").items).toEqual([]);
    expect(labelsOf(searchEverything(INPUT, "hea120 6m"))).toContain("hea120 6m x2");
  });

  it("does not care about the order of the words", () => {
    expect(labelsOf(searchEverything(INPUT, "6m hea120"))).toContain("hea120 6m x2");
    expect(labelsOf(searchEverything(INPUT, "x2 hea120"))).toContain("hea120 6m x2");
  });

  it("finds a size whatever the spacing around it", () => {
    expect(labelsOf(searchEverything(INPUT, "40x40"))).toContain("shs 40x40x3 6m");
    expect(labelsOf(searchEverything(INPUT, "shs40x40"))).toContain("shs 40x40x3 6m");
  });

  it("puts a label that starts with the term before one that only holds it", () => {
    const input: SearchInput = {
      lines: [],
      parts: [],
      projects: [
        {
          id: "proj-balkon",
          name: "Balkon ravan",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as unknown as Project,
        {
          id: "proj-ravna",
          name: "Ravna greda",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as unknown as Project,
      ],
      customers: [],
    };
    expect(idsOf(searchEverything(input, "rav"))).toEqual(["proj-ravna", "proj-balkon"]);
  });

  it("puts the newest thing first", () => {
    const input: SearchInput = {
      lines: [],
      parts: [
        {
          id: "part-nova",
          name: "Ograda nova",
          parts: [],
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as unknown as SavedEntry,
        {
          id: "part-stara",
          name: "Ograda stara",
          parts: [],
          updatedAt: "2026-09-01T00:00:00.000Z",
        } as unknown as SavedEntry,
      ],
      projects: [],
      customers: [],
    };
    expect(idsOf(searchEverything(input, "ograda"))).toEqual(["part-stara", "part-nova"]);
  });

  it("falls back to the kind order when nothing else separates two results", () => {
    const input: SearchInput = {
      lines: [],
      parts: [],
      projects: [],
      customers: [
        {
          id: "cust-alu",
          name: "Aluminij",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as unknown as Customer,
      ],
      sizes: [{ label: "Aluminij 6060", query: "al-6060" }],
    };
    expect(searchEverything(input, "aluminij").items.map((item) => item.kind)).toEqual([
      "customer",
      "size",
    ]);
  });

  it("never returns more than the limit", () => {
    const lines = Array.from({ length: 12 }, (_, index) => `hea${100 + index} 6m`);
    const input: SearchInput = { lines, parts: [], projects: [], customers: [] };
    expect(searchEverything(input, "hea", 4).items).toHaveLength(4);
  });

  it("stops at forty results by default", () => {
    const lines = Array.from({ length: 60 }, (_, index) => `hea${100 + index} 6m`);
    const input: SearchInput = { lines, parts: [], projects: [], customers: [] };
    expect(searchEverything(input, "hea").items).toHaveLength(40);
  });

  it("finds a project by the client it is for", () => {
    const results = searchEverything(INPUT, "Bosna Gradnja");
    expect(idsOf(results)).toContain("proj-hala");
    expect(results.items[0].kind).toBe("project");
  });

  it("finds a customer by their phone number", () => {
    const results = searchEverything(INPUT, "061 234");
    expect(idsOf(results)).toContain("cust-mehmed");
    expect(results.items[0].kind).toBe("customer");
  });

  it("finds a part by the name of one of its parts", () => {
    const results = searchEverything(INPUT, "rama");
    expect(idsOf(results)).toContain("part-ograda");
    expect(results.items[0].kind).toBe("part");
  });

  it("offers a compare row as a line it can restore", () => {
    const item: CompareItem = {
      id: "cmp-1",
      timestamp: "2026-07-01T09:00:00.000Z",
      input: BEAM_INPUT,
    } as unknown as CompareItem;
    const results = searchEverything({ ...INPUT, compare: [item] }, "hea120");
    const found = results.items.find((entry) => entry.id === "cmp-1");
    expect(found?.kind).toBe("line");
    expect(found?.query).toContain("hea120");
    expect(found?.at).toBe(Date.parse("2026-07-01T09:00:00.000Z"));
  });

  it("does not offer price book rates as results", () => {
    const results = searchEverything(
      { ...INPUT, priceBook: [{ gradeId: "steel-s235jr", unitPrice: 1.2 }] },
      "s235",
    );
    expect(results.items).toEqual([]);
  });
});
