import { findGradeByAlias } from "./aliases";
import { cmdClassifyToken, cmdParse, cmdTokenize } from "./parser";
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
  /**
   * The profile token this item borrowed from the item before it, when it
   * named a length but no profile of its own. Null for an item that names its
   * own profile — which is most of them.
   */
  inheritedProfile: string | null;
  /** The grade token this item borrowed, the same way. */
  inheritedGrade: string | null;
}

/**
 * A run of items that share one profile — the "one bar, several cuts" shape.
 * `hea120 6m + 8m + 10m` is one group of three, not three groups: the cuts
 * belong to the same section, and a fabricator thinks of them that way.
 */
export interface CommandLineGroup {
  /** Index of the first item in the group. */
  start: number;
  /** The item indexes in the group, in order. */
  items: number[];
  /** The profile token the group shares, or null when it has none. */
  profile: string | null;
  /** The grade token the group shares, or null when it has none. */
  grade: string | null;
  /** True when the group holds more than one item. */
  multi: boolean;
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
  /** Runs of items that share a profile. */
  groups: CommandLineGroup[];
}

interface RawSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * Split a line into items and keep each piece's offsets. Offsets are into the
 * original string — including whatever whitespace surrounded the separator —
 * so an edit to one item can be spliced back without disturbing the others.
 *
 * `+` is the separator the app writes. Commas and semicolons are accepted on
 * the way in because that is how people write a cut list in a chat message or
 * an email, and reading one as a single item produced a confidently wrong
 * number: in `hea120 6m x2, ipe200 4m x3` the `x2,` failed to tokenize, which
 * left the quantity slot open for the *second* item's `x3` to fill, and the
 * line totalled three HEA 120 and nothing else.
 */
const ITEM_SEPARATORS = new Set([COMMAND_ITEM_SEPARATOR, ",", ";"]);

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

/**
 * A comma with a digit on both sides is a decimal separator (`6,5m`), not an
 * item boundary — most of Europe writes lengths and rates that way, and the
 * price token has always accepted it.
 */
function isDecimalComma(raw: string, index: number): boolean {
  if (!/\d/.test(raw[index - 1] ?? "")) return false;
  // A comma at the very end of the line, right after a digit, is a decimal
  // separator still being typed (`6,` on the way to `6,5m`). Treating it as a
  // boundary at that keystroke made the desktop bar open a second item and
  // bake a space in after it, so `hea120 6,5m` became `hea120 6, 5m` and never
  // computed. A cut list's comma always has something after it.
  if (index === raw.length - 1) return true;
  return /\d/.test(raw[index + 1] ?? "");
}

function isItemBoundary(raw: string, index: number): boolean {
  const char = raw[index];
  if (!ITEM_SEPARATORS.has(char)) return false;
  if (char === COMMAND_ITEM_SEPARATOR) return !isArithmeticPlus(raw, index);
  if (char === ",") return !isDecimalComma(raw, index);
  return true;
}

export function cmdSplitLine(query: string): RawSegment[] {
  const raw = query ?? "";
  const out: RawSegment[] = [];
  let start = 0;
  for (let i = 0; i <= raw.length; i++) {
    if (i < raw.length && !isItemBoundary(raw, i)) continue;
    out.push({ text: raw.slice(start, i), start, end: i });
    start = i + 1;
  }
  return out;
}

/* ── the profile a cut belongs to ─────────────────────────────────────────── */

/**
 * The raw token that named the profile in a segment, if any. The token is
 * taken as written — "hea120" — because that is the text an edit has to
 * replace, not the canonical form the parser resolves it to.
 */
function profileTokenOf(tokens: string[]): string | null {
  for (const token of tokens) {
    if (cmdClassifyToken(token) === "profile") return token;
  }
  return null;
}

/** The raw token that named a grade, the same way. */
function gradeTokenOf(tokens: string[]): string | null {
  for (const token of tokens) {
    if (cmdClassifyToken(token) === "grade") return token;
  }
  return null;
}

/** How one item of the line is to be parsed. */
export interface CommandLineItemPlan {
  /** The segment's own tokens, as the tokenizer sees them. */
  tokens: string[];
  /** The profile token this item borrows from the item before it, if any. */
  inheritedProfile: string | null;
  /** The grade token this item borrows, the same way. */
  inheritedGrade: string | null;
}

export interface CommandLinePlan {
  /** One plan per `+`-joined segment, in order. */
  items: CommandLineItemPlan[];
  /** Runs of items that share a profile. */
  groups: CommandLineGroup[];
}

/**
 * Work out which profile each item belongs to, before anything is parsed.
 *
 * A cut of the bar before it needs no profile of its own: `hea120 6m + 8m`
 * is one section in two lengths, and repeating "hea120" three times to say so
 * is the kind of typing the command bar exists to remove. So an item that
 * names a length but no profile borrows the profile — and the explicitly
 * typed grade — of the item before it.
 *
 * Everything else is left alone. An item with no profile *and* no length
 * ("+ s235") is not a cut of anything, and guessing would turn a typo into a
 * number.
 */
export function cmdPlanLine(query: string): CommandLinePlan {
  const segments = cmdSplitLine(query ?? "");
  const plans: CommandLineItemPlan[] = [];
  /** The profile in force for the next item, and the grade that came with it. */
  let carriedProfile: string | null = null;
  let carriedGrade: string | null = null;

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const tokens = cmdTokenize(isLast ? segment.text : `${segment.text.trim()} `);
    const ownProfile = profileTokenOf(tokens);
    const ownGrade = gradeTokenOf(tokens);
    const hasLength = tokens.some((token) => cmdClassifyToken(token) === "len");

    const borrows = index > 0 && carriedProfile != null && ownProfile == null && hasLength;
    const inheritedProfile = borrows ? carriedProfile : null;
    const inheritedGrade = borrows && ownGrade == null ? carriedGrade : null;

    plans.push({ tokens, inheritedProfile, inheritedGrade });

    if (!borrows && ownProfile) {
      carriedProfile = ownProfile;
      // Only an explicitly typed grade travels; the shared default is not a
      // habit of this item, it is a shop setting.
      carriedGrade = ownGrade;
    }
  }

  return { items: plans, groups: groupPlans(plans) };
}

/**
 * Group the planned items into runs that share a profile. Two items are in
 * the same group when the profile in force for them is the same token and
 * the grade in force for them is the same token.
 */
function groupPlans(plans: CommandLineItemPlan[]): CommandLineGroup[] {
  const groups: CommandLineGroup[] = [];
  let carriedProfile: string | null = null;
  let carriedGrade: string | null = null;

  for (let index = 0; index < plans.length; index++) {
    const plan = plans[index];
    const ownProfile = profileTokenOf(plan.tokens);
    const ownGrade = gradeTokenOf(plan.tokens);
    const profile = plan.inheritedProfile ?? ownProfile;
    const grade = plan.inheritedGrade ?? ownGrade;
    const sameAsPrevious =
      groups.length > 0 &&
      profile != null &&
      profile === carriedProfile &&
      (grade ?? null) === (carriedGrade ?? null);

    if (sameAsPrevious) {
      groups[groups.length - 1].items.push(index);
    } else {
      groups.push({
        start: index,
        items: [index],
        profile,
        grade,
        multi: false,
      });
    }
    carriedProfile = profile;
    carriedGrade = grade;
  }

  for (const group of groups) group.multi = group.items.length > 1;
  return groups;
}

/**
 * The text one item is parsed as — its own text, plus what it borrows. The
 * item's own text is passed through verbatim: the parser reads the trailing
 * whitespace to know whether the last token is finished, and re-joining the
 * tokens would lose that and re-space a glued size.
 */
function planText(
  plan: CommandLineItemPlan,
  ownText: string,
): string {
  const borrowed = [
    ...(plan.inheritedProfile ? [plan.inheritedProfile] : []),
    ...(plan.inheritedGrade ? [plan.inheritedGrade] : []),
  ];
  if (borrowed.length === 0) return ownText;
  return `${borrowed.join(" ")} ${ownText}`;
}

export function cmdParseLine(query: string, settings: CommandParserSettings): CommandLine {
  const raw = query ?? "";
  const segments = cmdSplitLine(raw);
  const plan = cmdPlanLine(raw);

  const items: CommandLineItem[] = segments.map((segment, index) => {
    // Everything before the final segment is finished by definition — the `+`
    // committed it — so the parser must not treat its last token as half-typed.
    const ownText = index < segments.length - 1 ? `${segment.text.trim()} ` : segment.text;
    const itemPlan = plan.items[index] ?? {
      tokens: [],
      inheritedProfile: null,
      inheritedGrade: null,
    };
    const parse = cmdParse(planText(itemPlan, ownText), settings);
    return {
      text: segment.text,
      start: segment.start,
      end: segment.end,
      parse,
      inheritedProfile: itemPlan.inheritedProfile,
      inheritedGrade: itemPlan.inheritedGrade,
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
    issues: items.flatMap((item, index) =>
      item.parse.issues.map((issue) => ({ ...issue, itemIndex: index })),
    ),
    groups: plan.groups,
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
 * Rows are joined with the separator; blank rows collapse away. Anything a
 * spreadsheet puts between columns (tabs, semicolons, commas) marks a column
 * boundary rather than becoming a space, because the last column of a cut list
 * is the piece count and the grammar has no other way to know that: a bare
 * number reads as a length, so `HEA120 6m 2` would price one piece and discard
 * the 2 without a word. Returns null when there is nothing multi-row about the
 * text, so an ordinary paste stays an ordinary paste.
 */
export const MAX_PASTED_ITEMS = 20;

/** Column separators a spreadsheet or an email puts between cells. */
const PASTED_CELL_SEPARATOR_RE = /[\t;,]+/;
/** The grammar's own quantity markers — a cell already carrying one is done. */
const QTY_MARKED_RE = /^[x×*]/i;
/** A plain count: no unit, no decimal, inside the engine's quantity range. */
const BARE_COUNT_RE = /^\d{1,5}$/;
const MAX_QTY = 10_000;

function isBareCount(cell: string): boolean {
  if (!BARE_COUNT_RE.test(cell)) return false;
  // Several grades are spelled as bare numbers — 304, 316, 6060, 6082, 7075.
  // A cut list's last column is far more often "316" the steel than "316" the
  // piece count, and reading a grade as a quantity would be the same class of
  // silent error this function exists to remove.
  if (findGradeByAlias(cell)) return false;
  const value = Number(cell);
  return value >= 1 && value <= MAX_QTY;
}

/**
 * A cut-list row is profile / length / count. Only the trailing cell is
 * promoted, and only when the row has enough cells to have a length of its own
 * — a two-cell `HEA120 6m` has no count to find, and reading its `6m` as one
 * would be worse than leaving it alone.
 */
function normalizePastedRow(row: string): string {
  let cells = row.split(PASTED_CELL_SEPARATOR_RE).map((cell) => cell.trim()).filter(Boolean);
  // A plain-text list has no column separators at all; fall back to whitespace
  // so `HEA120 6m 2` pasted out of an email reads the same as the same row
  // pasted out of a spreadsheet.
  if (cells.length === 1) {
    cells = cells[0].split(/\s+/).filter(Boolean);
  }
  if (cells.length >= 3) {
    const last = cells[cells.length - 1];
    if (isBareCount(last) && !QTY_MARKED_RE.test(last)) {
      cells[cells.length - 1] = `x${last}`;
    }
  }
  return cells.join(" ").replace(/\s+/g, " ").trim();
}

export function cmdParsePastedList(text: string): string | null {
  const rows = (text ?? "")
    .split(/\r?\n/)
    .map(normalizePastedRow)
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
