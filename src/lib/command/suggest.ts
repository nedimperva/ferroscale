import {
  COMMAND_ALIAS_RE,
  COMMAND_ALIASES,
  COMMAND_GRADES,
  COMMAND_SIZES,
} from "./aliases";
import { cmdParse } from "./parser";
import type {
  CommandParseResult,
  CommandSettings,
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

export function cmdSuggest(
  query: string,
  settings: CommandSettings,
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
    const sizes = COMMAND_SIZES[p.alias.fam] ?? [];
    return {
      hint: `${p.alias.name} · standard size`,
      items: sizes.map<CommandSuggestionItem>((s) => ({
        label: s.replace(/x/g, "×"),
        ins: s,
        kind: "size",
        appendProfile: true,
      })),
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
        ins: g.alias,
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
