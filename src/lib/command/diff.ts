import { cmdClassifyToken, cmdTokenize } from "@ferroscale/metal-core";
import type { CommandLine, CommandTokenKind } from "@ferroscale/metal-core";

/**
 * Two diffs over one idea: what changed in a command line, and what changed in
 * a record. Pure and dependency-light, so the diff in the command bar, the
 * conflict view in sync and the correction a user teaches the app all read one
 * answer instead of three drifting copies of it.
 */

export type DiffChange = "same" | "added" | "removed" | "changed";

export interface TokenDiffEntry {
  /** The token text on the left (the reference). Empty when added. */
  from: string;
  /** The token text on the right (the current). Empty when removed. */
  to: string;
  /** The role the token plays, from cmdClassifyToken. */
  kind: CommandTokenKind;
  change: DiffChange;
}

export interface TokenDiff {
  entries: TokenDiffEntry[];
  /** True when nothing differs. */
  identical: boolean;
}

export interface MetricDelta {
  /** The reference value. */
  from: number | null;
  /** The current value. */
  to: number | null;
  /** to - from, or null when either side is null. */
  delta: number | null;
  /** The change as a percentage of `from`, or null. */
  percent: number | null;
}

export interface LineDiff {
  tokens: TokenDiff;
  weight: MetricDelta;
  cost: MetricDelta;
  quantity: MetricDelta;
  identical: boolean;
}

export interface FieldDiffEntry {
  key: string;
  from: unknown;
  to: unknown;
  change: DiffChange;
}

/** The tokenizer keeps the case the user typed; the grammar does not care. */
function normalizeToken(token: string): string {
  return token.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * One side of a token diff: the first token of every role, and the duplicates
 * behind it. The first one wins, because that is the parser's own rule — a
 * second length is shadowed by the first and never reaches the calculation.
 */
interface TokenRoles {
  first: Map<CommandTokenKind, string>;
  extra: Map<CommandTokenKind, string[]>;
}

function readRoles(tokens: string[]): TokenRoles {
  const first = new Map<CommandTokenKind, string>();
  const extra = new Map<CommandTokenKind, string[]>();
  for (const token of tokens) {
    const kind = cmdClassifyToken(token);
    if (!first.has(kind)) {
      first.set(kind, token);
      continue;
    }
    const list = extra.get(kind);
    if (list) list.push(token);
    else extra.set(kind, [token]);
  }
  return { first, extra };
}

function tokenChange(from: string | undefined, to: string | undefined): DiffChange {
  if (from === undefined && to === undefined) return "same";
  if (from === undefined) return "added";
  if (to === undefined) return "removed";
  return normalizeToken(from) === normalizeToken(to) ? "same" : "changed";
}

/**
 * Diff two queries by the role each token plays, not by its place in the line.
 * The grammar is order-tolerant — `hea120 6m x2` and `x2 hea120 6m` are the
 * same calculation — so a positional diff would report a rewrite where nothing
 * changed.
 *
 * A role's first token on each side is the one that counts; a duplicate behind
 * it is still listed, so the entry count matches the token count and a
 * shadowed token is never dropped in silence.
 */
export function diffTokens(a: string, b: string): TokenDiff {
  const left = readRoles(cmdTokenize(a));
  const right = readRoles(cmdTokenize(b));

  const kinds: CommandTokenKind[] = [];
  for (const kind of left.first.keys()) kinds.push(kind);
  for (const kind of right.first.keys()) {
    if (!left.first.has(kind)) kinds.push(kind);
  }

  const entries: TokenDiffEntry[] = [];
  for (const kind of kinds) {
    const from = left.first.get(kind);
    const to = right.first.get(kind);
    entries.push({ from: from ?? "", to: to ?? "", kind, change: tokenChange(from, to) });

    const leftExtra = left.extra.get(kind) ?? [];
    const rightExtra = right.extra.get(kind) ?? [];
    const count = Math.max(leftExtra.length, rightExtra.length);
    for (let index = 0; index < count; index++) {
      const extraFrom = leftExtra[index];
      const extraTo = rightExtra[index];
      entries.push({
        from: extraFrom ?? "",
        to: extraTo ?? "",
        kind,
        change: tokenChange(extraFrom, extraTo),
      });
    }
  }

  return {
    entries,
    identical: entries.every((entry) => entry.change === "same"),
  };
}

/** A missing value is a missing value on both sides of the delta — never a zero. */
function metricDelta(from: number | null, to: number | null): MetricDelta {
  const delta = from === null || to === null ? null : to - from;
  const percent =
    delta !== null && from !== null && Number.isFinite(from) && from !== 0
      ? (delta / from) * 100
      : null;
  return { from, to, delta, percent };
}

/** Two nulls are the same absence; a null and a number are not. */
function metricSame(metric: MetricDelta): boolean {
  if (metric.delta === null) return metric.from === null && metric.to === null;
  return metric.delta === 0;
}

/**
 * The quantity of the first item on each side, not the sum: a cut list has
 * many items and the diff is about one line of work, not about the whole
 * sheet of cuts.
 */
function firstRealQty(line: CommandLine): number | null {
  return line.items[0]?.parse.realQty ?? null;
}

/**
 * Diff two parsed lines: the tokens that changed, and what those changes did
 * to the weight, the cost and the piece count. The caller supplies the parsed
 * lines because the parser needs the shop's own pricing and grade settings —
 * this module never guesses them.
 */
export function diffLines(a: CommandLine, b: CommandLine): LineDiff {
  const tokens = diffTokens(a.raw, b.raw);
  const weight = metricDelta(a.totalKg, b.totalKg);
  const cost = metricDelta(a.totalAmount, b.totalAmount);
  const quantity = metricDelta(firstRealQty(a), firstRealQty(b));
  return {
    tokens,
    weight,
    cost,
    quantity,
    identical: tokens.identical && metricSame(weight) && metricSame(cost),
  };
}

/**
 * Two values are the same when they are the same primitive, or the same
 * object read the same way. A plain record has no order of its own, so
 * JSON is the honest comparison.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return Object.is(a, b);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function fieldChange(
  inA: boolean,
  inB: boolean,
  from: unknown,
  to: unknown,
): DiffChange {
  if (!inA) return "added";
  if (!inB) return "removed";
  return sameValue(from, to) ? "same" : "changed";
}

/**
 * Diff two records key by key — the field-level view of a project whose two
 * versions disagree. `keys` restricts the comparison; without it every key
 * either side carries is compared.
 */
export function diffFields(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  keys?: string[],
): FieldDiffEntry[] {
  const compared =
    keys ?? [...Object.keys(a), ...Object.keys(b).filter((key) => !hasOwn(a, key))];

  const out: FieldDiffEntry[] = [];
  for (const key of compared) {
    const inA = hasOwn(a, key);
    const inB = hasOwn(b, key);
    if (!inA && !inB) continue;
    const from = inA ? a[key] : undefined;
    const to = inB ? b[key] : undefined;
    out.push({ key, from, to, change: fieldChange(inA, inB, from, to) });
  }
  return out;
}
