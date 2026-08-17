import { cmdSplitLine, cmdTokenize } from "@ferroscale/metal-core";

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
  const groups: LineChipGroup[] = segments.map((segment, index) => ({
    item: index,
    tokens: tokensFor(segment.text, index === segments.length - 1),
  }));

  const last = groups[groups.length - 1];
  const hasPartial = !/\s$/.test(query) && last.tokens.length > 0;
  const partial = hasPartial ? last.tokens[last.tokens.length - 1] : "";
  if (hasPartial) last.tokens = last.tokens.slice(0, -1);

  return { groups, partial };
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
 * Backspace on an empty input: pull the active item's last chip back under the
 * caret. On an item with no chips yet there is nothing to pull, and the line is
 * left alone rather than reaching back across the separator.
 */
export function pullLastChip(query: string): string {
  const segments = cmdSplitLine(query);
  const item = segments.length - 1;
  const tokens = lineChips(query).groups[item].tokens;
  if (tokens.length === 0) return query;
  return editLineToken(query, item, tokens.length - 1);
}
