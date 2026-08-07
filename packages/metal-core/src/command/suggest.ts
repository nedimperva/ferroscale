import { toMillimeters } from "../calculator/units";
import type { LengthUnit } from "../calculator/types";
import type { ProfileId } from "../datasets/types";
import {
  COMMAND_ALIAS_RE,
  COMMAND_ALIASES,
  COMMAND_GRADES,
  COMMAND_SIZES,
} from "./aliases";
import { cmdClassifyToken, cmdParse, cmdTokenize, dimsToSizeText, SHEET_LIKE_FAMILIES } from "./parser";
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

/**
 * Per-metre weight for a candidate size. Computed by parsing a bare
 * profile+size query, which is why it's cached: the size stage re-derives it
 * for every catalog entry on every keystroke, and the value depends only on
 * the profile, the size and the grade providing the density — never on the
 * rest of the query.
 */
const kgmCache = new Map<string, number | null>();

function sizeKgm(
  alias: CommandAlias,
  sizeText: string,
  settings: CommandParserSettings,
): number | null {
  const key = `${alias.alias}|${sizeText}|${settings.defaultGradeId}`;
  const hit = kgmCache.get(key);
  if (hit !== undefined) return hit;
  const value = cmdParse(`${alias.alias}${sizeText} `, settings).kgm ?? null;
  kgmCache.set(key, value);
  return value;
}

/** Per-metre weight label, or undefined when it can't be shown (sheet-like
 *  families are priced per piece, not per metre). */
function sizeKgmSub(
  alias: CommandAlias,
  sizeText: string,
  settings: CommandParserSettings,
): string | undefined {
  if (SHEET_LIKE_FAMILIES.has(alias.fam)) return undefined;
  const kgm = sizeKgm(alias, sizeText, settings);
  return kgm != null ? kgmSub(kgm) : undefined;
}

/** Test hook — the cache is keyed by catalog data that never changes at
 *  runtime, but suites that swap datasets need a way to drop it. */
export function cmdResetSuggestCache(): void {
  kgmCache.clear();
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

/** Rounded total weight for a hypothetical length/quantity, from the parse we
 *  already have — no re-parse, since kg/m doesn't change. */
function totalKgSub(kgm: number | null, lengthM: number | null, qty: number): string | undefined {
  if (kgm == null || lengthM == null) return undefined;
  const total = kgm * lengthM * qty;
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return `${total >= 100 ? Math.round(total) : Number(total.toFixed(1))} kg`;
}

const REFINE_LENGTHS_M = [3, 4, 6, 12];
const MAX_REFINE_PER_KIND = 2;

/**
 * The finished-query stage. A complete line used to offer exactly one chip
 * ("Save calculation") at the moment the user is most likely to want a
 * *variation* — twice as many, twelve metres instead of six, the next size up.
 * These are those variations, each one tap, each showing what it would come to.
 */
function refineSuggestions(
  p: CommandParseResult,
  settings: CommandParserSettings,
  usage?: CommandUsageSource,
): CommandSuggestionItem[] {
  const alias = p.alias;
  if (!alias || p.lengthM == null) return [];
  const items: CommandSuggestionItem[] = [];
  const fam = alias.fam;
  const sheetLike = SHEET_LIKE_FAMILIES.has(fam);

  // ── quantity: double it, plus the quantities this user actually types
  const qty = p.realQty;
  const qtyCandidates = [
    qty * 2,
    ...(usage?.topQuantities(fam) ?? [])
      .map((token) => Number(token.slice(1)))
      .filter((n) => Number.isFinite(n) && n > 0),
  ];
  for (const candidate of dedupeNumbers(qtyCandidates, qty).slice(0, MAX_REFINE_PER_KIND)) {
    items.push({
      label: `× ${candidate}`,
      sub: totalKgSub(p.kgm, p.lengthM, candidate),
      kind: "refine",
      ins: `x${candidate}`,
      replaceKind: "qty",
    });
  }

  // ── length: the other stock lengths (sheet-like families bake length into
  //    the size token, so there's nothing to swap)
  if (!sheetLike) {
    const lengthCandidates = [
      ...(usage?.topLengths(fam) ?? [])
        .map((token) => parseLengthTokenM(token, settings))
        .filter((value): value is number => value != null),
      ...REFINE_LENGTHS_M,
    ];
    for (const candidate of dedupeNumbers(lengthCandidates, p.lengthM).slice(0, MAX_REFINE_PER_KIND)) {
      items.push({
        label: `${candidate} m`,
        sub: totalKgSub(p.kgm, candidate, qty),
        kind: "refine",
        ins: `${candidate}m`,
        replaceKind: "len",
      });
    }
  }

  // ── size: the neighbours of the current size in the catalog (one up, one
  //    down) — "do I need the next one up" without leaving the line
  const catalog = COMMAND_SIZES[fam] ?? [];
  const index = catalog.indexOf(p.size);
  if (index >= 0) {
    for (const neighbour of [catalog[index + 1], catalog[index - 1]]) {
      if (!neighbour) continue;
      items.push({
        label: neighbour.replace(/x/g, "×"),
        sub: sizeKgmSub(alias, neighbour, settings),
        fam,
        kind: "refine",
        ins: `${alias.alias}${neighbour}`,
        replaceKind: "size",
      });
    }
  }

  // ── grade: the one this user reaches for next in this family, else the
  //    obvious step up inside the same material group
  const currentGradeId = p.gradeId;
  const usedGradeId = (usage?.topGradeIds(fam) ?? []).find((id) => id !== currentGradeId);
  const currentGrade = COMMAND_GRADES.find((g) => g.id === currentGradeId);
  const fallbackGrade = COMMAND_GRADES.find(
    (g) => g.id !== currentGradeId && (!currentGrade || g.group === currentGrade.group),
  );
  const grade =
    COMMAND_GRADES.find((g) => g.id === usedGradeId) ?? fallbackGrade;
  if (grade) {
    items.push({
      label: grade.label,
      sub: grade.group,
      kind: "refine",
      ins: grade.aliases[0],
      replaceKind: "grade",
    });
  }

  return items;
}

const LENGTH_TOKEN_RE = /^(\d+(?:\.\d+)?)(mm|cm|m|in|ft)?$/;

/** Length token ("6m", "4500") in metres, using the same default-unit rule as
 *  the parser's bare-number fallback. */
function parseLengthTokenM(token: string, settings: CommandParserSettings): number | null {
  const match = token.match(LENGTH_TOKEN_RE);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (match[2] as LengthUnit | undefined) ?? settings.defaultLengthUnit;
  return toMillimeters(value, unit) / 1000;
}

/** Keep order, drop duplicates and anything equal to the current value. */
function dedupeNumbers(values: number[], exclude: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of values) {
    const rounded = Number(value.toFixed(3));
    if (rounded === Number(exclude.toFixed(3)) || seen.has(rounded)) continue;
    seen.add(rounded);
    out.push(rounded);
  }
  return out;
}

export function cmdSuggest(
  query: string,
  settings: CommandParserSettings,
  presetsForProfile?: (profileId: ProfileId) => CommandSizePreset[],
  usage?: CommandUsageSource,
  /** The caller's parse of the same query — passed in to avoid a second one. */
  parsed?: CommandParseResult,
): CommandSuggestion {
  const p = parsed && parsed.raw === query ? parsed : cmdParse(query, settings);
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
          group: "usage",
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
          group: "usage",
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
          group: "preset",
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
          group: "standard",
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
        group: used.includes(s) ? "usage" : "standard",
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
        group: used.includes(s) ? "usage" : "standard",
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
        group: usedIds.includes(g.id) ? "usage" : "standard",
      })),
    };
  }

  return {
    hint: "Refine",
    items: [
      ...refineSuggestions(p, settings, usage),
      // Sentinels the host acts on rather than inserting: starting a second
      // item is a line-level edit, and saving isn't an edit at all.
      { label: "+ item", ins: "__additem", kind: "item" },
      { label: "Save calculation", ins: "__save", kind: "save" },
    ],
  };
}

const QTY_TOKEN_RE = /^x\d+$/;

export function cmdApplyInsert(query: string, item: CommandSuggestionItem): string {
  // Host-handled sentinels never rewrite the text themselves.
  if (item.kind === "save" || item.kind === "item") return query;
  // Refine: swap the token that plays this role, keeping every other token
  // where it is. Appends when the query doesn't have one yet (a grade, say).
  if (item.replaceKind) {
    const tokens = cmdTokenize(query);
    const wanted = item.replaceKind === "size" ? "profile" : item.replaceKind;
    const index = tokens.findIndex((token) => cmdClassifyToken(token) === wanted);
    const next = index >= 0
      ? tokens.map((token, i) => (i === index ? item.ins : token))
      : [...tokens, item.ins];
    return `${next.join(" ")} `;
  }
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
