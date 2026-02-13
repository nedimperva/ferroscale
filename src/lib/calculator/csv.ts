import type { CalculationResult } from "@/lib/calculator/types";

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

  const escaped = rows.map(([label, value]) => {
    const safeLabel = `"${label.replaceAll('"', '""')}"`;
    const safeValue = `"${value.replaceAll('"', '""')}"`;
    return `${safeLabel},${safeValue}`;
  });

  return `Metric,Value\n${escaped.join("\n")}\n`;
}

export function downloadCsv(result: CalculationResult): void {
  const csv = createResultCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `advanced-metal-calculation-${timestamp}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
