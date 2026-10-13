/**
 * The command history's rules, kept pure so they can be tested without a
 * component: what counts as the same line, when a new line replaces the one
 * before it instead of stacking on top, and how the list reads by day.
 *
 * The history itself is a newest-first `string[]` (that is what syncs); when
 * each line was logged lives beside it as a `{ query: epochMs }` map.
 */

/** How many lines the history keeps. */
export const MAX_HISTORY = 200;

/**
 * A line that only adds to the one logged just before it, within this window,
 * replaces it: `hea120 6m` then `hea120 6m x2` is one calculation being
 * finished, not two. Past the window it is a new line of its own.
 */
export const REFINE_WINDOW_MS = 2 * 60 * 1000;

export type HistoryTimes = Record<string, number>;

/** Whitespace collapsed — what the line says, not how it was spaced. */
export function normalizeHistoryQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

/** Two lines that differ only in spacing or capitals are the same line. */
export function historyKey(query: string): string {
  return normalizeHistoryQuery(query).toLowerCase();
}

/** `next` is `prev` with more tokens after it (`hea120 6m` → `hea120 6m x2`). */
function extendsLine(next: string, prev: string): boolean {
  return next.length > prev.length && next.startsWith(`${prev} `);
}

export interface HistoryState {
  items: string[];
  times: HistoryTimes;
}

/**
 * Log one line. The newest copy of a line wins (an older duplicate is
 * dropped), and a line that finishes the one logged moments ago takes its
 * place, so the history holds calculations rather than keystrokes.
 */
export function pushHistoryEntry(
  state: HistoryState,
  query: string,
  now: number,
  max = MAX_HISTORY,
): HistoryState {
  const q = normalizeHistoryQuery(query);
  if (!q) return state;
  const key = historyKey(q);

  let items = state.items;
  const newest = items[0];
  if (
    newest !== undefined &&
    now - (state.times[newest] ?? 0) <= REFINE_WINDOW_MS &&
    extendsLine(key, historyKey(newest))
  ) {
    items = items.slice(1);
  }
  items = [q, ...items.filter((entry) => historyKey(entry) !== key)].slice(0, max);
  return { items, times: pruneTimes({ ...state.times, [q]: now }, items) };
}

/** Times for lines no longer in the list are dropped, so the map can't grow. */
export function pruneTimes(times: HistoryTimes, items: string[]): HistoryTimes {
  const next: HistoryTimes = {};
  for (const item of items) {
    const at = times[item];
    if (typeof at === "number" && Number.isFinite(at)) next[item] = at;
  }
  return next;
}

/**
 * Give every line a time. A line with none arrived from somewhere that does
 * not record them — Drive sync from another device, a backup, the release
 * before times existed — and is stamped with when this device first saw it.
 */
export function stampMissingTimes(times: HistoryTimes, items: string[], now: number): HistoryTimes {
  const next = pruneTimes(times, items);
  for (const item of items) if (next[item] === undefined) next[item] = now;
  return next;
}

export type HistoryDay = "today" | "yesterday" | "week" | "earlier";

export interface HistoryGroup {
  day: HistoryDay;
  items: string[];
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Which day bucket a time falls in, by the local calendar. */
export function historyDay(at: number | undefined, now: number): HistoryDay {
  if (at === undefined) return "earlier";
  const today = startOfDay(now);
  if (at >= today) return "today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (at >= yesterday.getTime()) return "yesterday";
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  if (at >= weekAgo.getTime()) return "week";
  return "earlier";
}

/** The list cut into Today / Yesterday / This week / Earlier, empty groups left out. */
export function groupHistoryByDay(items: string[], times: HistoryTimes, now: number): HistoryGroup[] {
  const order: HistoryDay[] = ["today", "yesterday", "week", "earlier"];
  const buckets = new Map<HistoryDay, string[]>(order.map((day) => [day, []]));
  for (const item of items) buckets.get(historyDay(times[item], now))!.push(item);
  return order
    .map((day) => ({ day, items: buckets.get(day)! }))
    .filter((group) => group.items.length > 0);
}

/** Today's lines — the session the running total and Save as project cover. */
export function todaysHistory(items: string[], times: HistoryTimes, now: number): string[] {
  return items.filter((item) => historyDay(times[item], now) === "today");
}

/**
 * Lines matching every word of the search, in any order and any case —
 * `120 hea` finds `hea120 6m`. Spaces inside a size are ignored, so
 * `40x40` finds `shs 40x40x3`.
 */
export function filterHistory(items: string[], search: string): string[] {
  const words = historyKey(search).split(" ").filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const key = historyKey(item);
    const glued = key.replace(/ /g, "");
    return words.every((word) => key.includes(word) || glued.includes(word));
  });
}
