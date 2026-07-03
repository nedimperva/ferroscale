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
      return t("profiles.plate");
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
