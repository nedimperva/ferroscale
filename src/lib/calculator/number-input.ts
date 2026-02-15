export function parseLocaleNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const compact = trimmed.replace(/[\s\u00A0\u202F']/g, "");
  if (compact === "" || compact === "+" || compact === "-") return null;

  const sign = compact.startsWith("-") ? "-" : compact.startsWith("+") ? "" : "";
  const unsigned = compact.startsWith("-") || compact.startsWith("+")
    ? compact.slice(1)
    : compact;

  if (unsigned === "") return null;
  if (/[^0-9.,]/.test(unsigned)) return null;

  const hasComma = unsigned.includes(",");
  const hasDot = unsigned.includes(".");

  let normalized = unsigned;

  if (hasComma && hasDot) {
    const commaIndex = unsigned.lastIndexOf(",");
    const dotIndex = unsigned.lastIndexOf(".");
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";

    const withoutThousands = unsigned.split(thousandsSeparator).join("");
    const decimalIndex = withoutThousands.lastIndexOf(decimalSeparator);
    normalized =
      withoutThousands.slice(0, decimalIndex).split(decimalSeparator).join("") +
      "." +
      withoutThousands.slice(decimalIndex + 1).split(decimalSeparator).join("");
  } else if (hasComma || hasDot) {
    const separator = hasComma ? "," : ".";
    const parts = unsigned.split(separator);

    if (parts.length === 2) {
      normalized = `${parts[0]}.${parts[1]}`;
    } else if (parts.length > 2) {
      const last = parts[parts.length - 1];
      const head = parts.slice(0, -1).join("");
      const groupingLike =
        last.length === 3 &&
        parts.slice(1, -1).every((chunk) => chunk.length === 3);

      normalized = groupingLike ? `${head}${last}` : `${head}.${last}`;
    }
  }

  if (!/^\d*\.?\d*$/.test(normalized)) return null;
  if (normalized === "" || normalized === ".") return null;

  const parsed = Number(`${sign}${normalized}`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatInputNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return String(value);
}
