import { cmdClassifyToken, cmdSplitLine, cmdTokenize } from "@ferroscale/metal-core";
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
}

export interface LineChips {
  groups: LineChipGroup[];
  /** The token under the caret — in the active item, never a chip. */
  partial: string;
}

/**
 * Non-target items are finished by the separators that flank them, so they tokenize
 * as committed text; only the target item can hold a half-typed token under the caret.
 */
function tokensFor(text: string, isTarget: boolean): string[] {
  return cmdTokenize(isTarget ? text : `${text.trim()} `);
}

export function lineChips(query: string, activeItemIndex?: number): LineChips {
  const segments = cmdSplitLine(query);
  const targetIndex =
    activeItemIndex != null && activeItemIndex >= 0 && activeItemIndex < segments.length
      ? activeItemIndex
      : Math.max(0, segments.length - 1);

  const groups: LineChipGroup[] = segments.map((segment, index) => ({
    item: index,
    tokens: tokensFor(segment.text, index === targetIndex),
  }));

  const targetGroup = groups[targetIndex];
  const targetSegment = segments[targetIndex];
  const endsSpace = targetSegment ? /\s$/.test(targetSegment.text) : true;
  const hasPartial = !endsSpace && (targetGroup?.tokens.length ?? 0) > 0;
  const partial = hasPartial ? targetGroup.tokens[targetGroup.tokens.length - 1] : "";
  if (hasPartial && targetGroup) {
    targetGroup.tokens = targetGroup.tokens.slice(0, -1);
  }

  return { groups, partial };
}

/**
 * Which `+` item shows its tokens. `null` means the last item that still has
 * chips — an empty trailing segment (just opened with `+`) is not a reason to
 * collapse the item you were editing.
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
  activeItem?: number,
): string {
  const segments = cmdSplitLine(query);
  if (item < 0 || item >= segments.length) return query;
  const isTarget = activeItem != null ? item === activeItem : item === segments.length - 1;
  const segment = segments[item];
  const next = rewrite(tokensFor(segment.text, isTarget));

  // A leading space keeps `a + b` reading as `a + b` rather than `a +b`, and a
  // trailing one keeps the remaining tokens chips instead of turning the last
  // into a half-typed partial.
  const lead = item > 0 ? " " : "";
  const trail = next.length > 0 && (!isTarget || /\s$/.test(query)) ? " " : "";
  const text = next.length > 0 ? `${lead}${next.join(" ")}${trail}` : lead;
  return `${query.slice(0, segment.start)}${text}${query.slice(segment.end)}`;
}

export function removeLineToken(query: string, item: number, token: number): string {
  return withItemTokens(query, item, (tokens) => tokens.filter((_, i) => i !== token));
}

/** Remove an entire item segment from a multi-item line. */
export function removeLineItem(query: string, itemIndex: number): string {
  const segments = cmdSplitLine(query);
  if (itemIndex < 0 || itemIndex >= segments.length) return query;
  if (segments.length <= 1) return "";
  const remaining = segments.filter((_, i) => i !== itemIndex);
  return remaining.map((s) => s.text.trim()).join(" + ");
}

/** Duplicate an item segment in a multi-item line and append it as a new segment. */
export function duplicateLineItem(query: string, itemIndex: number): string {
  const segments = cmdSplitLine(query);
  if (itemIndex < 0 || itemIndex >= segments.length) return query;
  const targetText = segments[itemIndex].text.trim();
  if (!targetText) return query;
  return `${query.trim()} + ${targetText}`;
}

/**
 * Move an item segment to another position on the line — the stepper sheet's
 * "Earlier" and "Later". Out-of-range or no-op moves return the line as it was.
 */
export function moveLineItem(query: string, from: number, to: number): string {
  const segments = cmdSplitLine(query);
  const n = segments.length;
  if (from === to || from < 0 || from >= n || to < 0 || to >= n) return query;
  const texts = segments.map((s) => s.text.trim());
  const [moved] = texts.splice(from, 1);
  texts.splice(to, 0, moved);
  return texts.join(" + ");
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
export function editLineToken(
  query: string,
  item: number,
  token: number,
  activeItem?: number,
): string {
  const segments = cmdSplitLine(query);
  if (item < 0 || item >= segments.length) return query;
  const isTarget = activeItem != null ? item === activeItem : item === segments.length - 1;
  const tokens = tokensFor(segments[item].text, isTarget);
  if (token < 0 || token >= tokens.length) return query;

  const moved = tokens[token];
  const others = tokens.filter((_, i) => i !== token);
  const lead = item > 0 ? " " : "";
  const body = [...others, moved].join(" ");
  // No trailing space when this is the target item: the moved token is now
  // the one under the caret. On non-target items it stays committed.
  const text = `${lead}${body}${isTarget ? "" : " "}`;
  return `${query.slice(0, segments[item].start)}${text}${query.slice(segments[item].end)}`;
}

/**
 * Apply an edit to a designated item (defaults to the last item). Everything
 * the keypad and the suggestion bar do lands here, scoped to the active item.
 */
export function applyToActiveItem(
  query: string,
  rewrite: (text: string) => string,
  itemIndex?: number,
): string {
  const segments = cmdSplitLine(query);
  if (segments.length === 0) return query;
  const idx =
    itemIndex != null && itemIndex >= 0 && itemIndex < segments.length
      ? itemIndex
      : segments.length - 1;
  const active = segments[idx];
  const lead = idx > 0 ? " " : "";
  const trail = idx < segments.length - 1 ? " " : "";
  const rewritten = rewrite(active.text.replace(/^\s+/, ""));
  const cleanRewritten = idx < segments.length - 1 && !rewritten.endsWith(" ")
    ? `${rewritten}${trail}`
    : rewritten;
  return `${query.slice(0, active.start)}${lead}${cleanRewritten}${query.slice(active.end)}`;
}

/** The text of the active item — what suggestions are computed from. */
export function activeItemText(query: string, itemIndex?: number): string {
  const segments = cmdSplitLine(query);
  if (segments.length === 0) return "";
  const idx =
    itemIndex != null && itemIndex >= 0 && itemIndex < segments.length
      ? itemIndex
      : segments.length - 1;
  return segments[idx].text.trim();
}

/**
 * Replace the editable partial token of a designated item. Used by the desktop
 * <GhostField> onChange so typing splices cleanly into the active tab.
 */
export function replaceLinePartial(
  query: string,
  itemIndex: number,
  nextPartial: string,
): string {
  const segments = cmdSplitLine(query);
  if (itemIndex < 0 || itemIndex >= segments.length) return query;
  const segment = segments[itemIndex];
  const { groups } = lineChips(query, itemIndex);
  const tokens = groups[itemIndex]?.tokens ?? [];
  const lead = itemIndex > 0 ? " " : "";
  const body = tokens.length > 0 ? `${tokens.join(" ")} ` : "";
  const trail = itemIndex < segments.length - 1 ? " " : "";
  const newSegmentText = `${lead}${body}${nextPartial}${trail}`;
  return `${query.slice(0, segment.start)}${newSegmentText}${query.slice(segment.end)}`;
}

/**
 * Everything before the caret token for a designated item.
 */
export function lineChipPrefix(query: string, itemIndex?: number): string {
  const segments = cmdSplitLine(query);
  if (segments.length === 0) return "";
  const idx =
    itemIndex != null && itemIndex >= 0 && itemIndex < segments.length
      ? itemIndex
      : segments.length - 1;
  const active = segments[idx];
  const tokens = lineChips(query, idx).groups[idx]?.tokens ?? [];
  const lead = idx > 0 ? " " : "";
  const body = tokens.length > 0 ? `${tokens.join(" ")} ` : "";
  return `${query.slice(0, active.start)}${lead}${body}`;
}

/**
 * Backspace on an empty input: pull the active item's last chip back under the
 * caret. On an item with no chips yet there is nothing to pull.
 */
export function pullLastChip(query: string, itemIndex?: number): string {
  const segments = cmdSplitLine(query);
  if (segments.length === 0) return query;
  const item =
    itemIndex != null && itemIndex >= 0 && itemIndex < segments.length
      ? itemIndex
      : segments.length - 1;
  const tokens = lineChips(query, item).groups[item]?.tokens ?? [];
  if (tokens.length === 0) return query;
  return editLineToken(query, item, tokens.length - 1, item);
}

/**
 * Prepare an item for editing on mobile keypad "Tweak":
 * Pull the active item's length token under the caret as the editable partial.
 * If no length token is present, pull the item's last chip.
 */
export function tweakActiveItem(query: string, itemIndex?: number): string {
  const segments = cmdSplitLine(query);
  if (segments.length === 0) return query;
  const item =
    itemIndex != null && itemIndex >= 0 && itemIndex < segments.length
      ? itemIndex
      : segments.length - 1;
  const tokens = cmdTokenize(segments[item].text);
  const lenIndex = tokens.findIndex((t) => cmdClassifyToken(t) === "len");
  if (lenIndex >= 0) {
    return editLineToken(query, item, lenIndex, item);
  }
  return pullLastChip(query, item);
}
