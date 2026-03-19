import { describe, expect, it } from "vitest";
import { createResultCsv } from "@/lib/calculator/csv";
import { csvEscape } from "@/lib/csv-utils";
import type { CalculationResult } from "@/lib/calculator/types";

function makeMockResult(overrides?: Partial<CalculationResult>): CalculationResult {
  return {
    profileId: "round_bar",
    profileLabel: "Round Bar",
    gradeLabel: "S235JR",
    densityKgPerM3: 7850,
    areaMm2: 706.858347,
    lengthMm: 6000,
    quantity: 2,
    unitWeightKg: 33.273,
    totalWeightKg: 66.546,
    totalWeightLb: 146.738,
    unitPriceAmount: 2.4,
    subtotalAmount: 159.71,
    wasteAmount: 7.986,
    subtotalWithWasteAmount: 167.696,
    vatAmount: 35.216,
    grandTotalAmount: 202.912,
    currency: "EUR",
    priceBasis: "weight",
    priceUnit: "kg",
    formulaLabel: "A = π × d² / 4",
    datasetVersion: "1.0.0",
    referenceLabels: ["EN 10060", "EN 10025-2"],
    surfaceAreaM2: 0.754,
    unitSurfaceAreaM2: 0.377,
    breakdownRows: [],
    ...overrides,
  };
}

describe("createResultCsv", () => {
  it("starts with the header row", () => {
    const csv = createResultCsv(makeMockResult());
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toBe("Metric,Value");
  });

  it("ends with a trailing newline", () => {
    const csv = createResultCsv(makeMockResult());
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("contains all expected field labels", () => {
    const csv = createResultCsv(makeMockResult());
    const expectedLabels = [
      "Profile",
      "Material",
      "Density (kg/m3)",
      "Area (mm2)",
      "Length (mm)",
      "Quantity",
      "Unit weight (kg)",
      "Total weight (kg)",
      "Total weight (lb)",
      "Unit price",
      "Subtotal",
      "Waste amount",
      "Subtotal with waste",
      "VAT amount",
      "Grand total",
      "Currency",
      "Price basis",
      "Price unit",
      "Formula",
      "Dataset version",
      "References",
    ];
    for (const label of expectedLabels) {
      expect(csv).toContain(label);
    }
  });

  it("includes correct values from the result", () => {
    const csv = createResultCsv(makeMockResult());
    expect(csv).toContain("Round Bar");
    expect(csv).toContain("S235JR");
    expect(csv).toContain("7850");
    expect(csv).toContain("6000");
    expect(csv).toContain("EUR");
    expect(csv).toContain("1.0.0");
  });

  it("joins referenceLabels with pipe separator", () => {
    const result = makeMockResult({
      referenceLabels: ["EN 10060", "EN 10025-2"],
    });
    const csv = createResultCsv(result);
    expect(csv).toContain("EN 10060 | EN 10025-2");
  });

  it("adds profile and material standard rows when present on the result", () => {
    const csv = createResultCsv(
      makeMockResult({
        profileReferenceLabel: "EN 10060",
        materialReferenceLabel: "EN 10025-2",
      }),
    );
    expect(csv).toContain("Profile standard");
    expect(csv).toContain("Material standard");
    expect(csv).toContain("EN 10060");
    expect(csv).toContain("EN 10025-2");
  });

  it("produces the correct number of data rows (20 fields + header)", () => {
    const csv = createResultCsv(makeMockResult());
    const lines = csv.split("\n").filter((line) => line.length > 0);
    // 1 header + 21 data rows
    expect(lines).toHaveLength(22);
  });

  it("escapes values containing commas", () => {
    const result = makeMockResult({
      profileLabel: "Beam, Heavy",
    });
    const csv = createResultCsv(result);
    // The value should be quoted because it contains a comma
    expect(csv).toContain('"Beam, Heavy"');
  });

  it("escapes values containing double quotes", () => {
    const result = makeMockResult({
      gradeLabel: 'Steel "Premium"',
    });
    const csv = createResultCsv(result);
    // Double quotes should be doubled and wrapped
    expect(csv).toContain('"Steel ""Premium"""');
  });
});

describe("csvEscape", () => {
  it("returns plain strings unchanged", () => {
    expect(csvEscape("hello")).toBe("hello");
  });

  it("returns numbers as strings", () => {
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(3.14)).toBe("3.14");
  });

  it("wraps strings containing commas in double quotes", () => {
    expect(csvEscape("one,two")).toBe('"one,two"');
  });

  it("wraps strings containing newlines in double quotes", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("doubles internal double quotes and wraps", () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it("handles strings with both commas and quotes", () => {
    expect(csvEscape('"a",b')).toBe('"""a"",b"');
  });

  it("returns empty string unchanged", () => {
    expect(csvEscape("")).toBe("");
  });

  it("does not wrap strings without special characters", () => {
    expect(csvEscape("plain text")).toBe("plain text");
  });
});
