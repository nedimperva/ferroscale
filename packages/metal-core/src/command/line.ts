import { cmdParse } from "./parser";
import type { CommandParseIssue, CommandParseResult, CommandParserSettings } from "./types";

/**
 * A line can hold more than one item: `hea120 6m x2 + ipe200 4m x3`. Each
 * `+`-joined segment is an ordinary query, parsed by the ordinary parser — the
 * grammar doesn't change, it just repeats. That keeps every existing behaviour
 * (order tolerance, glue splitting, targets, price overrides) working per item
 * for free, and makes a one-item line indistinguishable from what it was.
 *
 * `+` is safe as the separator because nothing else in the grammar uses it as
 * a joiner: sizes join with `x`, rates with `@`, targets with `=`. The one
 * overlap is arithmetic (`x2+3`), settled by shape rather than guesswork —
 * see `isArithmeticPlus`.
 */

export const COMMAND_ITEM_SEPARATOR = "+";

export interface CommandLineItem {
  /** The segment as the parser saw it. */
  text: string;
  /** Where the segment's text begins in the raw query, for splicing edits back. */
  start: number;
  /** Where it ends (exclusive). */
  end: number;
  parse: CommandParseResult;
}

export interface CommandLine {
  raw: string;
  /** One per `+`-joined segment, in order. Never empty. */
  items: CommandLineItem[];
  /** True once the line joins more than one item. */
  multi: boolean;
  /**
   * The item the user is working on — the last one, which is where typing
   * happens. Suggestions and chip edits act on this segment alone.
   */
  activeIndex: number;
  /** Every item parsed to a calculation. */
  valid: boolean;
  /** Sum across items; null unless every item is valid. */
  totalKg: number | null;
  totalAmount: number | null;
  /** Every item's issues, in item order. */
  issues: CommandParseIssue[];
}

interface RawSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * Split on `+` and keep each piece's offsets. Offsets are into the original
 * string — including whatever whitespace surrounded the separator — so an edit
 * to one item can be spliced back without disturbing the others.
 */
/**
 * A `+` glued between a character and a digit is arithmetic (`x2+3`), not a
 * separator. A new item always opens with a profile alias — a letter — so
 * "digit on the right" is enough to tell the two apart, and any whitespace at
 * all (`6m + ipe200`) means the separator regardless.
 */
function isArithmeticPlus(raw: string, index: number): boolean {
  const before = raw[index - 1];
  const after = raw[index + 1];
  if (!before || !after) return false;
  if (/\s/.test(before) || /\s/.test(after)) return false;
  return /\d/.test(after);
}

export function cmdSplitLine(query: string): RawSegment[] {
  const raw = query ?? "";
  const out: RawSegment[] = [];
  let start = 0;
  for (let i = 0; i <= raw.length; i++) {
    if (i < raw.length) {
      if (raw[i] !== COMMAND_ITEM_SEPARATOR) continue;
      if (isArithmeticPlus(raw, i)) continue;
    }
    out.push({ text: raw.slice(start, i), start, end: i });
    start = i + 1;
  }
  return out;
}

export function cmdParseLine(query: string, settings: CommandParserSettings): CommandLine {
  const raw = query ?? "";
  const segments = cmdSplitLine(raw);

  const items: CommandLineItem[] = segments.map((segment, index) => {
    // Everything before the final segment is finished by definition — the `+`
    // committed it — so the parser must not treat its last token as half-typed.
    const committed = index < segments.length - 1 ? `${segment.text.trim()} ` : segment.text;
    return {
      text: segment.text,
      start: segment.start,
      end: segment.end,
      parse: cmdParse(committed, settings),
    };
  });

  const multi = items.length > 1;
  const valid = items.every((item) => item.parse.valid);
  const sum = (pick: (parse: CommandParseResult) => number | null): number | null => {
    if (!valid) return null;
    let total = 0;
    for (const item of items) total += pick(item.parse) ?? 0;
    return total;
  };

  return {
    raw,
    items,
    multi,
    activeIndex: items.length - 1,
    valid,
    totalKg: sum((parse) => parse.totalKg),
    totalAmount: sum((parse) => parse.totalAmount),
    issues: items.flatMap((item) => item.parse.issues),
  };
}

/**
 * Replace one item's text, leaving the rest of the line — and the separators —
 * exactly as they were. This is what every edit inside a multi-item line goes
 * through, so the other items can never be reflowed by an edit to their
 * neighbour.
 */
export function cmdReplaceLineItem(query: string, index: number, text: string): string {
  const segments = cmdSplitLine(query ?? "");
  if (index < 0 || index >= segments.length) return query ?? "";
  const target = segments[index];
  return `${query.slice(0, target.start)}${text}${query.slice(target.end)}`;
}

/**
 * Turn pasted text into a line. A cut list lives in a spreadsheet or an email
 * as one part per row, which is exactly one item per row here — so pasting it
 * should produce the line the user would otherwise have typed, not a single
 * unparseable blob.
 *
 * Rows are joined with the separator; blank rows and anything a spreadsheet
 * puts between columns (tabs, semicolons, commas) collapse to spaces, since
 * the grammar is order-tolerant and reads `HEA120 6m 2` the same either way.
 * Returns null when there is nothing multi-row about the text, so an ordinary
 * paste stays an ordinary paste.
 */
export const MAX_PASTED_ITEMS = 20;

export function cmdParsePastedList(text: string): string | null {
  const rows = (text ?? "")
    .split(/\r?\n/)
    .map((row) => row.replace(/[\t;,]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (rows.length < 2) return null;
  // A paste far longer than a line anyone would work with is a mis-paste; take
  // the first rows rather than building a query nobody can read or edit.
  return `${rows.slice(0, MAX_PASTED_ITEMS).join(` ${COMMAND_ITEM_SEPARATOR} `)} `;
}

/**
 * Paste a cut list into whatever is already on the line. Returns null when the
 * text isn't a multi-row list, so an ordinary paste stays an ordinary paste and
 * the browser handles it.
 *
 * The rows are appended rather than substituted: a paste that silently threw
 * away a line the user had already typed would be a destructive edit with no
 * undo, and "I meant to add these" is by far the likelier intent.
 */
export function cmdPasteIntoLine(query: string, text: string): string | null {
  const list = cmdParsePastedList(text);
  if (!list) return null;
  const existing = (query ?? "").trim();
  if (!existing) return list;
  return `${existing} ${COMMAND_ITEM_SEPARATOR} ${list}`;
}

/**
 * Append an empty item and return the query to type into. The trailing space
 * is what lets the parser treat the previous item as finished.
 */
export function cmdAppendLineItem(query: string): string {
  const trimmed = (query ?? "").trimEnd();
  if (!trimmed) return trimmed;
  return `${trimmed} ${COMMAND_ITEM_SEPARATOR} `;
}
