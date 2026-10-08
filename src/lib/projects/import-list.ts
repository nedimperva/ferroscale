/**
 * A pasted bar list, one bar per line, into command-line queries.
 *
 * Two shapes are read. A line with commas, semicolons or tabs is the shape a
 * drawing's cut list or a spreadsheet pastes as: profile, length in mm,
 * quantity — "SHS 40x40x3, 2400, 12". Anything else is taken as the command
 * line's own grammar ("hea120 6m x2"), so a list copied out of the session
 * tape imports as it is.
 */

/** Tabs, then semicolons, then commas: a list split on ";" may use "," as its decimal point. */
function separatorOf(line: string): string | null {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  if (line.includes(",")) return ",";
  return null;
}

export function barListLineToQuery(line: string): string {
  const trimmed = line.trim();
  const separator = separatorOf(trimmed);
  if (!separator) return trimmed;
  const [profile = "", length = "", qty = ""] = trimmed.split(separator).map((cell) => cell.trim());
  const parts = [profile];
  if (length) parts.push(/^\d+(?:[.,]\d+)?$/.test(length) ? `${length.replace(",", ".")}mm` : length);
  if (qty) parts.push(/^\d+$/.test(qty) ? `x${qty}` : qty);
  return parts.filter(Boolean).join(" ");
}

/** The non-blank lines of a pasted list, each as a query. */
export function barListQueries(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(barListLineToQuery);
}
