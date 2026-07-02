import type { ProfileId } from "../datasets/types";
import {
  COMMAND_ALIAS_RE,
  COMMAND_ALIASES,
  COMMAND_GRADES,
  COMMAND_SIZES,
} from "./aliases";
import { cmdParse, dimsToSizeText } from "./parser";
import type {
  CommandAlias,
  CommandParseResult,
  CommandParserSettings,
  CommandSizePreset,
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

const FRONT_ALIASES = [
  "hea", "heb", "ipe", "upn",
  "t",
  "shs", "rhs", "chs",
  "rnd", "flt", "l",
  "plt", "chq",
];

/**
 * Convert a saved CommandSizePreset into the size text Command appends onto the
 * profile token (e.g. {side:40, wallThickness:3} → "40x40x3"). Returns null
 * when the preset is missing required dimensions for the family.
 */
export function presetToSizeText(
  alias: CommandAlias,
  preset: CommandSizePreset,
): string | null {
  if (alias.profileId) {
    // Standard profiles: strip the alias prefix off the size id ("hea120" → "120").
    const sizeId = preset.selectedSizeId;
    if (!sizeId || !sizeId.startsWith(alias.alias)) return null;
    const rest = sizeId.slice(alias.alias.length);
    return rest.length > 0 ? rest : null;
  }
  // Plate-like presets carry length separately as `lengthValue` (mm).
  return dimsToSizeText(alias.fam, preset.manualDimensionsMm, preset.lengthValue);
}

const MAX_RECENT_SUGGESTIONS = 3;

export function cmdSuggest(
  query: string,
  settings: CommandParserSettings,
  presetsForProfile?: (profileId: ProfileId) => CommandSizePreset[],
  recentQueries?: string[],
): CommandSuggestion {
  const p = cmdParse(query, settings);
  const { stage, partial } = detectStage(query, p);

  if (stage === "empty" || stage === "profile") {
    // Recent valid queries first — one tap re-runs a whole calculation.
    const recentItems: CommandSuggestionItem[] = [];
    if (recentQueries) {
      for (const rq of recentQueries) {
        if (recentItems.length >= MAX_RECENT_SUGGESTIONS) break;
        const trimmed = rq.trim();
        if (!trimmed) continue;
        if (partial && !trimmed.toLowerCase().startsWith(partial.toLowerCase())) continue;
        const rp = cmdParse(trimmed, settings);
        if (!rp.valid) continue;
        recentItems.push({
          label: trimmed,
          fam: rp.alias?.fam,
          kind: "recent",
          // Trailing space so the inserted query lands fully chipped.
          ins: `${trimmed} `,
          replaceLast: !!partial,
        });
      }
    }

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
      items: [
        ...recentItems,
        ...final.map<CommandSuggestionItem>((a) => ({
          label: a.name,
          fam: a.fam,
          kind: "profile",
          ins: a.alias,
          replaceLast: !!partial,
        })),
      ],
    };
  }

  if (stage === "size" && p.alias) {
    const alias = p.alias;
    const standard = COMMAND_SIZES[alias.fam] ?? [];
    const seen = new Set<string>();

    // Sizes the user recently calculated for this family, newest first.
    const recentSizeItems: CommandSuggestionItem[] = [];
    if (recentQueries) {
      for (const rq of recentQueries) {
        if (recentSizeItems.length >= MAX_RECENT_SUGGESTIONS) break;
        const rp = cmdParse(rq, settings);
        if (!rp.valid || rp.alias?.alias !== alias.alias || !rp.hasSize) continue;
        const text = rp.size;
        if (seen.has(text) || standard.includes(text)) continue;
        seen.add(text);
        recentSizeItems.push({
          label: text.replace(/x/g, "×"),
          fam: alias.fam,
          ins: text,
          kind: "size",
          appendProfile: true,
        });
      }
    }

    const profileId = alias.profileId ?? alias.manualProfileId;
    const presetItems: CommandSuggestionItem[] = [];
    if (profileId && presetsForProfile) {
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
        ...recentSizeItems,
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
  // Completed-stage inserts (size/length/qty/grade) end with a trailing
  // space so the next stage starts clean — no manual space key on mobile.
  if (item.appendProfile) {
    return query + item.ins + " ";
  }
  const pre = query === "" || /\s$/.test(query) ? "" : " ";
  const post = item.space ? " " : "";
  return query + pre + item.ins + post;
}

// re-export COMMAND_ALIAS_RE so consumers can build regexes without duplicating logic
export { COMMAND_ALIAS_RE };
