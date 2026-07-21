import {
  CURRENCY_SYMBOLS,
  findAliasByProfileId,
  fsMoney,
  fsWeight,
  fsWeightUnit,
} from "@ferroscale/metal-core";
import type {
  CommandAlias,
  CommandFamily,
  CommandParseIssue,
  CommandParseResult,
  CommandSuggestion,
  CommandSuggestionItem,
} from "@ferroscale/metal-core";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

type CommandT = (key: string, values?: Record<string, string | number>) => string;

/** Profile family (glyph key) for a stored calculation input. */
export function familyForInput(input: CalculationInput): CommandFamily | undefined {
  return findAliasByProfileId(input.profileId)?.fam;
}

/** "238.8 kg · € 286.56" — the standard saved/compare row subtitle. */
export function formatWeightPriceSubtitle(result: CalculationResult): string {
  const sym = CURRENCY_SYMBOLS[result.currency] ?? "€";
  return `${fsWeight(result.totalWeightKg)} ${fsWeightUnit(result.totalWeightKg)} · ${sym} ${fsMoney(result.grandTotalAmount)}`;
}

/**
 * The faint inline completion to draw after the caret: the remainder of the top
 * suggestion when it cleanly extends the trailing partial token (profile letters
 * being typed, or a recent-query prefix). Empty when there's nothing
 * unambiguous to finish — the caller then shows no ghost. Accepting it means
 * inserting `sug.items[0]`.
 */
export function computeGhost(partial: string, sug: CommandSuggestion): string {
  if (!partial) return "";
  const top = sug.items[0];
  if (!top || !top.replaceLast) return "";
  const ins = top.ins;
  if (
    ins.length > partial.length &&
    ins.toLowerCase().startsWith(partial.toLowerCase())
  ) {
    return ins.slice(partial.length);
  }
  return "";
}

/**
 * Apply a did-you-mean fix: swap the first (case-insensitive) occurrence of the
 * offending token for the suggested text, keeping a trailing space so the query
 * re-chips cleanly. Shared by the phone, medium, and desktop issue lines.
 */
export function applyIssueSuggestion(
  query: string,
  token: string,
  replacement: string,
): string {
  const at = query.toLowerCase().indexOf(token.toLowerCase());
  const next =
    at < 0
      ? query
      : query.slice(0, at) + replacement + query.slice(at + token.length);
  return /\s$/.test(next) ? next : next + " ";
}

export function formatCommandIssue(t: CommandT, issue: CommandParseIssue): string {
  switch (issue.code) {
    case "unknownToken":
      return t("issues.unknownToken", { token: issue.token });
    case "unknownSize":
      return t("issues.unknownSize", {
        profile: String(issue.params?.profile ?? ""),
        size: String(issue.params?.size ?? issue.token),
      });
    case "invalidQty":
      return t("issues.invalidQty");
    case "invalidGeometry":
      // Engine validation messages are not localized yet — show them as-is.
      return issue.message;
  }
}

export function formatCommandHint(t: CommandT, hint: string): string {
  const standardSizeSuffix = " · standard size";
  if (hint.endsWith(standardSizeSuffix)) {
    return `${hint.slice(0, -standardSizeSuffix.length)} · ${t("suggest.standardSize")}`;
  }

  switch (hint) {
    case "Profiles":
      return t("suggest.profiles");
    case "Pick a profile":
      return t("suggest.pickProfile");
    case "Length":
      return t("suggest.length");
    case "Pieces":
      return t("suggest.pieces");
    case "Grade (optional)":
      return t("suggest.gradeOptional");
    case "Ready":
      return t("suggest.ready");
    default:
      return hint;
  }
}

export function formatCommandSuggestionLabel(
  t: CommandT,
  item: CommandSuggestionItem,
): string {
  if (item.kind === "save") return t("suggest.saveCalculation");
  if (item.kind === "profile") return formatProfileLabel(t, item.label);
  return item.label;
}

export function formatCommandAliasName(t: CommandT, alias: CommandAlias): string {
  switch (alias.fam) {
    case "round":
      return t("profiles.round");
    case "sqbar":
      return t("profiles.squareBar");
    case "flat":
      return t("profiles.flat");
    case "angle":
      return t("profiles.angle");
    case "panel":
      return alias.name === "Sheet" ? t("profiles.sheet") : t("profiles.plate");
    case "chequered":
      return t("profiles.chequered");
    case "expanded":
      return t("profiles.expanded");
    case "corrugated":
      return t("profiles.corrugated");
    default:
      return alias.name;
  }
}

export function formatCommandParseName(
  t: CommandT,
  parsed: Pick<CommandParseResult, "alias" | "hasSize" | "size" | "name">,
): string | null {
  if (!parsed.alias) return parsed.name;
  const label = formatCommandAliasName(t, parsed.alias);
  return parsed.hasSize ? `${label} ${parsed.size.replace(/x/g, "×")}` : label;
}

function formatProfileLabel(t: CommandT, label: string): string {
  switch (label) {
    case "Round":
      return t("profiles.round");
    case "Square bar":
      return t("profiles.squareBar");
    case "Flat":
      return t("profiles.flat");
    case "Angle":
      return t("profiles.angle");
    case "Plate":
      return t("profiles.plate");
    case "Sheet":
      return t("profiles.sheet");
    case "Chequered":
      return t("profiles.chequered");
    case "Expanded":
      return t("profiles.expanded");
    case "Corrugated":
      return t("profiles.corrugated");
    default:
      return label;
  }
}
