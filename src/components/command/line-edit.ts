import {
  COMMAND_ITEM_SEPARATOR,
  cmdClassifyToken,
  cmdPlanLine,
  cmdSplitLine,
  cmdTokenize,
} from "@ferroscale/metal-core";
import type { CommandTokenKind } from "@ferroscale/metal-core";

/**
 * Chip and caret editing for a line that may hold several `+`-joined items.
 *
 * Every edit is scoped to one item. That is the whole rule: removing a token
 * from the first item must not reflow the second, and pulling a token back for
 * editing must not teleport it across a `+` into a different calculation. The
 * pure functions live here so the phone shell and the desktop view share one
 * behaviour instead of two drifting copies of the same index arithmetic.
 */

export interface LineChipGroup {
  /** Index of the item this group belongs to. */
  item: number;
  /** Completed tokens, rendered as chips. */
  tokens: string[];
  /** Which run of items this item belongs to — items that share a profile. */
  group: number;
  /** True when the run holds more than one item. */
  groupMulti: boolean;
  /** True on the first item of the run — where the header is drawn. */
  groupStart: boolean;
  /** How many items the run holds. */
  groupItems: number;
  /**
   * The profile token the run shares, when it holds more than one item. The
   * item that owns it renders it once, as the run's header.
   */
  groupProfile: string | null;
  /** Where that token sits in this item's tokens — set on the item that owns it. */
  groupProfileIndex: number | null;
}

export interface LineChips {
  groups: LineChipGroup[];
  /** The token under the caret — always in the last item, never a chip. */
  partial: string;
}

/**
 * Non-final items are finished by the `+` that follows them, so they tokenize
 * as committed text; only the final item can hold a half-typed token.
 */
function tokensFor(text: string, isLast: boolean): string[] {
  return cmdTokenize(isLast ? text : `${text.trim()} `);
}

export function lineChips(query: string): LineChips {
  const segments = cmdSplitLine(query);
  const plan = cmdPlanLine(query);
  const groups: LineChipGroup[] = segments.map((segment, index) => {
    const tokens = tokensFor(segment.text, index === segments.length - 1);
    const group = plan.groups.find((entry) => entry.items.includes(index)) ?? null;
    const groupProfile = group && group.multi ? group.profile : null;
    // The token that names the profile sits in the item that typed it; that
    // item renders it once, as the run's header.
    const groupProfileIndex =
      groupProfile == null
        ? -1
        : tokens.findIndex((token) => token.toLowerCase() === groupProfile.toLowerCase());
    return {
      item: index,
      tokens,
      group: plan.groups.indexOf(group as never),
      groupMulti: Boolean(group?.multi),
      groupStart: Boolean(group && group.items[0] === index),
      groupItems: group?.items.length ?? 1,
      groupProfile: groupProfileIndex >= 0 ? groupProfile : null,
      groupProfileIndex: groupProfileIndex >= 0 ? groupProfileIndex : null,
    };
  });

  const last = groups[groups.length - 1];
  const hasPartial = !/\s$/.test(query) && last.tokens.length > 0;
  const partial = hasPartial ? last.tokens[last.tokens.length - 1] : "";
  if (hasPartial) last.tokens = last.tokens.slice(0, -1);

  return { groups, partial };
}

/**
 * Drop a whole run of items — the bar's answer to "remove this bar and the
 * cuts I made from it". The profile belongs to the first item of the run, so
 * removing only that token would leave the rest of the run naming nothing.
 */
export function removeLineGroup(query: string, group: number): string {
  const plan = cmdPlanLine(query);
  const target = plan.groups[group];
  if (!target) return query;
  let next = query;
  // Back to front, so the offsets of the items still to go stay valid.
  for (const item of [...target.items].sort((a, b) => b - a)) {
    next = removeLineItem(next, item);
  }
  return next;
}

/**
 * Add another cut to a run. The new item names only its length, and the
 * length inherits the run's profile — which is the whole point of the run.
 */
export function addLengthToGroup(query: string, group: number, length: string): string {
  const plan = cmdPlanLine(query);
  const target = plan.groups[group];
  if (!target) return query;
  const text = length.trim();
  if (!text) return query;
  const last = target.items[target.items.length - 1];
  const segments = cmdSplitLine(query);
  const end = segments[last]?.end ?? query.length;
  const head = query.slice(0, end).replace(/\s+$/, "");
  return `${head} ${COMMAND_ITEM_SEPARATOR} ${text} `;
}

/**
 * Which `+` item shows its tokens. `null` means the last item — the one the
 * caret is in. A `+` closes the item before it at once: waiting for the new
 * item's first chip left the old one spelled out while its first word was
 * typed, so the bar looked like it was still editing the wrong thing.
 */
export function lineExpandedIndex(
  groups: LineChipGroup[],
  expandedItem: number | null,
): number {
  if (expandedItem != null && expandedItem >= 0 && expandedItem < groups.length) {
    return expandedItem;
  }
  return Math.max(0, groups.length - 1);
}

/** Rewrite one item's tokens, keeping every other item and separator intact. */
function withItemTokens(
  query: string,
  item: number,
  rewrite: (tokens: string[]) => string[],
): string {
  const segments = cmdSplitLine(query);
  if (item < 0 || item >= segments.length) return query;
  const isLast = item === segments.length - 1;
  const segment = segments[item];
  const next = rewrite(tokensFor(segment.text, isLast));

  // A leading space keeps `a + b` reading as `a + b` rather than `a +b`, and a
  // trailing one keeps the remaining tokens chips instead of turning the last
  // into a half-typed partial.
  const lead = item > 0 ? " " : "";
  const trail = next.length > 0 && (!isLast || /\s$/.test(query)) ? " " : "";
  const text = next.length > 0 ? `${lead}${next.join(" ")}${trail}` : lead;
  return `${query.slice(0, segment.start)}${text}${query.slice(segment.end)}`;
}

export function removeLineToken(query: string, item: number, token: number): string {
  return withItemTokens(query, item, (tokens) => tokens.filter((_, i) => i !== token));
}

/** Swap one token in place — used by the chip stepper so a nudge does not
 *  pull the token to the caret the way tap-to-edit does. */
export function replaceLineToken(
  query: string,
  item: number,
  token: number,
  next: string,
): string {
  return withItemTokens(query, item, (tokens) =>
    tokens.map((current, i) => (i === token ? next : current)),
  );
}

/** Swap the token that plays this role in one item (profile, length, …). */
export function replaceItemTokenKind(
  query: string,
  item: number,
  kind: CommandTokenKind,
  next: string,
): string {
  return withItemTokens(query, item, (tokens) => {
    const index = tokens.findIndex((token) => cmdClassifyToken(token) === kind);
    return index >= 0
      ? tokens.map((token, i) => (i === index ? next : token))
      : [...tokens, next];
  });
}

/**
 * Pull a token back to the end of *its own item* as the editable partial. The
 * parser is order-tolerant within an item, so the reordering is free.
 */
export function editLineToken(query: string, item: number, token: number): string {
  const segments = cmdSplitLine(query);
  if (item < 0 || item >= segments.length) return query;
  const isLast = item === segments.length - 1;
  const tokens = tokensFor(segments[item].text, isLast);
  if (token < 0 || token >= tokens.length) return query;

  const moved = tokens[token];
  const others = tokens.filter((_, i) => i !== token);
  const lead = item > 0 ? " " : "";
  const body = [...others, moved].join(" ");
  // No trailing space: the moved token is now the one under the caret. On a
  // non-final item there is no caret to give it, so it stays committed.
  const text = `${lead}${body}${isLast ? "" : " "}`;
  return `${query.slice(0, segments[item].start)}${text}${query.slice(segments[item].end)}`;
}

/**
 * Apply an edit to the item being typed — the last one. Everything the keypad
 * and the suggestion bar do lands here, because they always act at the caret.
 */
export function applyToActiveItem(query: string, rewrite: (text: string) => string): string {
  const segments = cmdSplitLine(query);
  const active = segments[segments.length - 1];
  const lead = segments.length > 1 ? " " : "";
  const rewritten = rewrite(active.text.replace(/^\s+/, ""));
  return `${query.slice(0, active.start)}${lead}${rewritten}${query.slice(active.end)}`;
}

/** The text of the item being typed — what suggestions are computed from. */
export function activeItemText(query: string): string {
  const segments = cmdSplitLine(query);
  return segments[segments.length - 1].text.replace(/^\s+/, "");
}

/**
 * Everything before the caret token: the earlier items with their separators
 * untouched, then this item's chips. The desktop bar keeps only the partial in
 * the real `<input>`, so this is what gets prepended to whatever is typed —
 * rebuilt from tokens, not sliced, so glued input ("hea1006m") stays split.
 */
export function lineChipPrefix(query: string): string {
  const segments = cmdSplitLine(query);
  const active = segments[segments.length - 1];
  const tokens = lineChips(query).groups[segments.length - 1].tokens;
  const lead = segments.length > 1 ? " " : "";
  const body = tokens.length > 0 ? `${tokens.join(" ")} ` : "";
  return `${query.slice(0, active.start)}${lead}${body}`;
}

/**
 * Drop one whole item and the separator that joined it. The items either side
 * close up around the gap; the last item keeps whatever half-typed token it
 * held, and when the last item itself goes, the new last one ends committed.
 */
export function removeLineItem(query: string, item: number): string {
  const segments = cmdSplitLine(query);
  if (item < 0 || item >= segments.length) return query;
  if (segments.length === 1) return "";
  const removedLast = item === segments.length - 1;
  const kept = segments.filter((_, i) => i !== item);
  const texts = kept.map((segment, i) =>
    i === kept.length - 1 && !removedLast ? segment.text.trimStart() : segment.text.trim(),
  );
  const joined = texts.filter((text, i) => text !== "" || i === texts.length - 1).join(` ${COMMAND_ITEM_SEPARATOR} `);
  if (!removedLast) return joined;
  return joined.trim() ? `${joined.trimEnd()} ` : "";
}

/**
 * A `+` that opened an item nothing has been typed into yet. Returns the line
 * without it, or `null` when the last item already holds something (or there
 * is only one item) — then there is no separator to take back.
 */
export function dropEmptyLastItem(query: string): string | null {
  const segments = cmdSplitLine(query);
  if (segments.length < 2 || segments[segments.length - 1].text.trim() !== "") return null;
  return removeLineItem(query, segments.length - 1);
}

/**
 * Backspace on an empty input: pull the active item's last chip back under the
 * caret. On an item with no chips yet — a `+` just typed — backspace takes the
 * separator back instead, so an item added by mistake never means starting
 * the whole line over.
 */
export function pullLastChip(query: string): string {
  const segments = cmdSplitLine(query);
  const item = segments.length - 1;
  const tokens = lineChips(query).groups[item].tokens;
  if (tokens.length === 0) return dropEmptyLastItem(query) ?? query;
  return editLineToken(query, item, tokens.length - 1);
}

/**
 * Prepare an item for editing on mobile keypad "Tweak":
 * Pull the active item's length token under the caret as the editable partial.
 * If no length token is present, pull the item's last chip.
 */
export function tweakActiveItem(query: string): string {
  const segments = cmdSplitLine(query);
  const item = segments.length - 1;
  if (item < 0 || item >= segments.length) return query;
  const tokens = cmdTokenize(segments[item].text);
  const lenIndex = tokens.findIndex((t) => cmdClassifyToken(t) === "len");
  if (lenIndex >= 0) {
    return editLineToken(query, item, lenIndex);
  }
  return pullLastChip(query);
}
