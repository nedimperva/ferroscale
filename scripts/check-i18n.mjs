import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const messagesDir = path.resolve(process.cwd(), "messages");
const baseLocale = "en";

function flattenKeys(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    const nestedKeys = flattenKeys(nested, nextKey);
    return nestedKeys.length > 0 ? nestedKeys : [nextKey];
  });
}

function formatList(locale, title, keys) {
  if (keys.length === 0) return "";
  const body = keys.map((key) => `  - ${key}`).join("\n");
  return `\n[${locale}] ${title} (${keys.length})\n${body}\n`;
}

async function loadMessages(locale) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const file = await readFile(filePath, "utf8");
  return JSON.parse(file);
}

async function main() {
  const files = await readdir(messagesDir);
  const locales = files
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();

  if (!locales.includes(baseLocale)) {
    console.error(`Missing base locale file: ${baseLocale}.json`);
    process.exit(1);
  }

  const base = await loadMessages(baseLocale);
  const baseKeys = new Set(flattenKeys(base));

  let hasErrors = false;

  for (const locale of locales) {
    if (locale === baseLocale) continue;

    const current = await loadMessages(locale);
    const currentKeys = new Set(flattenKeys(current));

    const missing = [...baseKeys].filter((key) => !currentKeys.has(key)).sort();
    const extra = [...currentKeys].filter((key) => !baseKeys.has(key)).sort();

    if (missing.length > 0 || extra.length > 0) {
      hasErrors = true;
      process.stderr.write(formatList(locale, "Missing keys", missing));
      process.stderr.write(formatList(locale, "Extra keys", extra));
    }
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log(`i18n check passed for locales: ${locales.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
