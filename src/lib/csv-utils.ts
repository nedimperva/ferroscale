/**
 * Shared CSV utilities used by single result, compare, and project exports.
 */

/** Escape a value for safe inclusion in a CSV cell. */
export function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/** Trigger a file download from a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Build a CSV Blob from a string and trigger download. */
export function downloadCsvString(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}
