import type { ProfileId } from "@ferroscale/metal-core";
import type { DimensionPreset } from "@/hooks/usePresets";
import {
  COMMAND_ALIAS_RE,
  COMMAND_ALIASES,
  COMMAND_GRADES,
  COMMAND_SIZES,
} from "./aliases";
import { cmdParse } from "./parser";
import type {
  CommandAlias,
  CommandParseResult,
  CommandParserSettings,
  CommandSuggestion,
  CommandSuggestionItem,
} from "./types";

type Stage = "empty" | "profile" | "size" | "length" | "qty" | "grade" | "done";

function detectStage(query: string, p: CommandParseResult): { stage: Stage; partial: string } {
  const endsSpace = query === "" || /\s$/.test(query);
  const partial = endsSpace ? "" : query.trim().split(/\s+/).pop() || "";
  if (query.trim() === "") return { stage: "empty", partial: "" };
  const partialIsAlpha = /^[a-z]+$/i.test(partial);
  if (!p.alias) {
    return { stage: "profile", partial: partialIsAlpha ? partial : "" };
  }
  if (!p.hasSize) return { stage: "size", partial: "" };
  if (p.lengthM == null) return { stage: "length", partial };
  if (p.qty == null) return { stage: "qty", partial };
  if (!p.gradeId) return { stage: "grade", partial };
  return { stage: "done", partial };
}

const FRONT_ALIASES = ["hea", "heb", "ipe", "upn", "shs", "rhs", "chs", "rnd", "flt", "l"];

const fmt = (n: number) => String(n);

/**
 * Convert a saved DimensionPreset into the size text Command appends onto the
 * profile token (e.g. {side:40, wallThickness:3} → "40x40x3"). Returns null
 * when the preset is missing required dimensions for the family.
 */
export function presetToSizeText(
  alias: CommandAlias,
  preset: DimensionPreset,
): string | null {
  if (alias.profileId) {
    // Standard profiles: strip the alias prefix off the size id ("hea120" → "120").
    const sizeId = preset.selectedSizeId;
    if (!sizeId || !sizeId.startsWith(alias.alias)) return null;
    const rest = sizeId.slice(alias.alias.length);
    return rest.length > 0 ? rest : null;
  }
  const d = preset.manualDimensionsMm;
  switch (alias.fam) {
    case "shs":
      return d.side != null && d.wallThickness != null
        ? `${fmt(d.side)}x${fmt(d.side)}x${fmt(d.wallThickness)}`
        : null;
    case "rhs":
      return d.width != null && d.height != null && d.wallThickness != null
        ? `${fmt(d.width)}x${fmt(d.height)}x${fmt(d.wallThickness)}`
        : null;
    case "chs":
      return d.outerDiameter != null && d.wallThickness != null
        ? `${fmt(d.outerDiameter)}x${fmt(d.wallThickness)}`
        : null;
    case "round":
      return d.diameter != null ? fmt(d.diameter) : null;
    case "sqbar":
      return d.side != null ? fmt(d.side) : null;
    case "flat":
      return d.width != null && d.thickness != null
        ? `${fmt(d.width)}x${fmt(d.thickness)}`
        : null;
    case "angle":
      return d.legA != null && d.legB != null && d.thickness != null
        ? `${fmt(d.legA)}x${fmt(d.legB)}x${fmt(d.thickness)}`
        : null;
    default:
      return null;
  }
}

export function cmdSuggest(
  query: string,
  settings: CommandParserSettings,
  presetsForProfile?: (profileId: ProfileId) => DimensionPreset[],
): CommandSuggestion {
  const p = cmdParse(query, settings);
  const { stage, partial } = detectStage(query, p);

  if (stage === "empty" || stage === "profile") {
    const list = COMMAND_ALIASES.filter((a) => FRONT_ALIASES.includes(a.alias));
    const matches = partial
      ? list.filter(
          (a) =>
            a.alias.startsWith(partial) ||
            a.name.toLowerCase().startsWith(partial),
        )
      : list;
    const final = matches.length ? matches : list;
    return {
      hint: partial ? "Profiles" : "Pick a profile",
      items: final.map<CommandSuggestionItem>((a) => ({
        label: a.name,
        fam: a.fam,
        kind: "profile",
        ins: a.alias,
        replaceLast: !!partial,
      })),
    };
  }

  if (stage === "size" && p.alias) {
    const alias = p.alias;
    const standard = COMMAND_SIZES[alias.fam] ?? [];
    const profileId = alias.profileId ?? alias.manualProfileId;
    const presetItems: CommandSuggestionItem[] = [];
    if (profileId && presetsForProfile) {
      const seen = new Set<string>();
      for (const preset of presetsForProfile(profileId)) {
        const text = presetToSizeText(alias, preset);
        if (!text || seen.has(text) || standard.includes(text)) continue;
        seen.add(text);
        presetItems.push({
          label: text.replace(/x/g, "×"),
          sub: preset.label,
          fam: alias.fam,
          ins: text,
          kind: "size",
          appendProfile: true,
        });
      }
    }
    return {
      hint: `${alias.name} · standard size`,
      items: [
        ...presetItems,
        ...standard.map<CommandSuggestionItem>((s) => ({
          label: s.replace(/x/g, "×"),
          ins: s,
          kind: "size",
          appendProfile: true,
        })),
      ],
    };
  }

  if (stage === "length") {
    return {
      hint: "Length",
      items: ["3m", "4m", "6m", "12m"].map<CommandSuggestionItem>((s) => ({
        label: s,
        ins: s,
        kind: "length",
        space: true,
      })),
    };
  }

  if (stage === "qty") {
    return {
      hint: "Pieces",
      items: ["x1", "x2", "x5", "x10", "x20"].map<CommandSuggestionItem>((s) => ({
        label: "× " + s.slice(1),
        ins: s,
        kind: "qty",
        space: true,
      })),
    };
  }

  if (stage === "grade") {
    return {
      hint: "Grade (optional)",
      items: COMMAND_GRADES.map<CommandSuggestionItem>((g) => ({
        label: g.label,
        sub: g.group,
        ins: g.aliases[0],
        kind: "grade",
        space: true,
      })),
    };
  }

  return {
    hint: "Ready",
    items: [{ label: "Save calculation", ins: "__save", kind: "save" }],
  };
}

export function cmdApplyInsert(query: string, item: CommandSuggestionItem): string {
  if (item.kind === "save") return query;
  if (item.replaceLast) {
    const parts = query.split(/(\s+)/);
    let i = parts.length - 1;
    while (i >= 0 && /^\s*$/.test(parts[i])) i--;
    if (i >= 0) parts[i] = item.ins;
    return parts.join("");
  }
  if (item.appendProfile) {
    return query + item.ins;
  }
  const pre = query === "" || /\s$/.test(query) ? "" : " ";
  return query + pre + item.ins;
}

// re-export COMMAND_ALIAS_RE so consumers can build regexes without duplicating logic
export { COMMAND_ALIAS_RE };
