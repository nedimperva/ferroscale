import type { ProfileId } from "../datasets/types";
import {
  COMMAND_ALIAS_RE,
  COMMAND_ALIASES,
  COMMAND_GRADES,
  COMMAND_SIZES,
} from "./aliases";
import { cmdParse, dimsToSizeText, SHEET_LIKE_FAMILIES } from "./parser";
import type {
  CommandAlias,
  CommandFamily,
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
const MAX_USAGE_SIZES = 4;
const MAX_USAGE_VALUES = 3;

/** "26.7 kg/m" — the per-metre weight shown under a size chip so the user
 *  can judge sizes without picking one. Fewer decimals as the number grows. */
function kgmSub(kgm: number): string {
  const digits = kgm < 10 ? 2 : kgm < 100 ? 1 : 0;
  return `${kgm.toFixed(digits)} kg/m`;
}

/** Per-metre weight for a candidate size, or undefined when it can't be shown
 *  (sheet-like families are priced per piece, not per metre). */
function sizeKgmSub(
  alias: CommandAlias,
  sizeText: string,
  settings: CommandParserSettings,
): string | undefined {
  if (SHEET_LIKE_FAMILIES.has(alias.fam)) return undefined;
  const rp = cmdParse(`${alias.alias}${sizeText} `, settings);
  return rp.kgm != null ? kgmSub(rp.kgm) : undefined;
}

/**
 * What the user actually types, ranked by the consumer (typically frequency ×
 * recency), split per profile family so SHS habits never pollute HEA
 * suggestions. All methods may return [] — every stage falls back to the
 * curated defaults. Storage lives with the consumer (the web app persists to
 * localStorage); this package stays storage-agnostic.
 */
export interface CommandUsageSource {
  /** Settled valid queries, newest first. */
  recentQueries(): string[];
  /** Size texts for the family (e.g. "40x40x3", "120"), best first. */
  topSizes(fam: CommandFamily): string[];
  /** Length tokens for the family (e.g. "6m", "4500"), best first. */
  topLengths(fam: CommandFamily): string[];
  /** Quantity tokens for the family (e.g. "x2"), best first. */
  topQuantities(fam: CommandFamily): string[];
  /** Material grade ids for the family, best first. */
  topGradeIds(fam: CommandFamily): string[];
}

export function cmdSuggest(
  query: string,
  settings: CommandParserSettings,
  presetsForProfile?: (profileId: ProfileId) => CommandSizePreset[],
  usage?: CommandUsageSource,
): CommandSuggestion {
  const p = cmdParse(query, settings);
  const { stage, partial } = detectStage(query, p);

  if (stage === "empty" || stage === "profile") {
    // Queries the user actually ran, first — one tap re-runs the calculation.
    const recentItems: CommandSuggestionItem[] = [];
    if (usage) {
      for (const rq of usage.recentQueries()) {
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

    // The sizes this user actually uses for THIS family, best first. Each is
    // re-validated against the current catalog so stale entries never render.
    const usageSizeItems: CommandSuggestionItem[] = [];
    if (usage) {
      for (const text of usage.topSizes(alias.fam)) {
        if (usageSizeItems.length >= MAX_USAGE_SIZES) break;
        if (!text || seen.has(text) || standard.includes(text)) continue;
        const rp = cmdParse(`${alias.alias}${text} `, settings);
        if (rp.kgm == null) continue;
        seen.add(text);
        usageSizeItems.push({
          label: text.replace(/x/g, "×"),
          sub: SHEET_LIKE_FAMILIES.has(alias.fam) ? undefined : kgmSub(rp.kgm),
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
        ...usageSizeItems,
        ...presetItems,
        ...standard.map<CommandSuggestionItem>((s) => ({
          label: s.replace(/x/g, "×"),
          sub: sizeKgmSub(alias, s, settings),
          ins: s,
          kind: "size",
          appendProfile: true,
        })),
      ],
    };
  }

  if (stage === "length") {
    const curated = ["3m", "4m", "6m", "12m"];
    const used = p.alias && usage
      ? usage.topLengths(p.alias.fam)
          .filter((s) => s && !curated.includes(s))
          .slice(0, MAX_USAGE_VALUES)
      : [];
    return {
      hint: "Length",
      items: [...used, ...curated].map<CommandSuggestionItem>((s) => ({
        label: s,
        ins: s,
        kind: "length",
        space: true,
      })),
    };
  }

  if (stage === "qty") {
    const curated = ["x1", "x2", "x5", "x10", "x20"];
    const used = p.alias && usage
      ? usage.topQuantities(p.alias.fam)
          .filter((s) => QTY_TOKEN_RE.test(s) && !curated.includes(s))
          .slice(0, MAX_USAGE_VALUES)
      : [];
    return {
      hint: "Pieces",
      items: [...used, ...curated].map<CommandSuggestionItem>((s) => ({
        label: "× " + s.slice(1),
        ins: s,
        kind: "qty",
        space: true,
      })),
    };
  }

  if (stage === "grade") {
    // Grades the user actually picks for this family come first; the rest of
    // the catalog keeps its usual order behind them.
    const usedIds = p.alias && usage ? usage.topGradeIds(p.alias.fam) : [];
    const ordered = [
      ...usedIds
        .map((id) => COMMAND_GRADES.find((g) => g.id === id))
        .filter((g): g is (typeof COMMAND_GRADES)[number] => !!g),
      ...COMMAND_GRADES.filter((g) => !usedIds.includes(g.id)),
    ];
    return {
      hint: "Grade (optional)",
      items: ordered.map<CommandSuggestionItem>((g) => ({
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

const QTY_TOKEN_RE = /^x\d+$/;

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
