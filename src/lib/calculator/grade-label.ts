/**
 * Resolves a raw gradeLabel string to a localized display label.
 * Handles the two sentinel values produced by the calculation engine.
 *
 * @param label - The raw gradeLabel from CalculationResult
 * @param t     - The base translation function (useTranslations() with no namespace)
 */
export function resolveGradeLabel(
  label: string,
  t: (key: string) => string,
): string {
  if (label === "Custom density input") return t("dataset.customDensityInput");
  if (label === "Unknown") return t("dataset.unknown");
  return label;
}
