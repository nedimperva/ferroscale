import type { CalculationResult } from "@/lib/calculator/types";
import { csvEscape, downloadCsvString } from "@/lib/csv-utils";

export function createResultCsv(result: CalculationResult): string {
  const rows: Array<[string, string]> = [
    ["Profile", result.profileLabel],
    ["Material", result.gradeLabel],
    ["Density (kg/m3)", String(result.densityKgPerM3)],
    ["Area (mm2)", String(result.areaMm2)],
    ["Length (mm)", String(result.lengthMm)],
    ["Quantity", String(result.quantity)],
    ["Unit weight (kg)", String(result.unitWeightKg)],
    ["Total weight (kg)", String(result.totalWeightKg)],
    ["Total weight (lb)", String(result.totalWeightLb)],
    ["Unit price", String(result.unitPriceAmount)],
    ["Subtotal", String(result.subtotalAmount)],
    ["Waste amount", String(result.wasteAmount)],
    ["Subtotal with waste", String(result.subtotalWithWasteAmount)],
    ["VAT amount", String(result.vatAmount)],
    ["Grand total", String(result.grandTotalAmount)],
    ["Currency", result.currency],
    ["Price basis", result.priceBasis],
    ["Price unit", result.priceUnit],
    ["Formula", result.formulaLabel],
    ["Dataset version", result.datasetVersion],
    ["References", result.referenceLabels.join(" | ")],
  ];

  const escaped = rows.map(([label, value]) =>
    `${csvEscape(label)},${csvEscape(value)}`,
  );

  return `Metric,Value\n${escaped.join("\n")}\n`;
}

export function downloadCsv(result: CalculationResult): void {
  const csv = createResultCsv(result);
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  downloadCsvString(csv, `advanced-metal-calculation-${timestamp}.csv`);
}
