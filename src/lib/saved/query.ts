import type { SavedEntry } from "@/hooks/useSaved";

/**
 * Search, tag-filter and sort for the Saved library. Pure and UI-free so both
 * surfaces (desktop grid/table, mobile library sheet) share one behaviour —
 * and so it can be tested without a DOM.
 */

export const SAVED_SORTS = ["recent", "used", "lastUsed", "name"] as const;
export type SavedSort = (typeof SAVED_SORTS)[number];

export interface SavedQuery {
  /** Free text over name, notes, tags, profile label and grade. */
  search?: string;
  /** Entry must carry every selected tag (AND — narrowing, not widening). */
  tags?: string[];
  sort?: SavedSort;
}

function haystack(entry: SavedEntry): string {
  return [
    entry.name,
    entry.notes ?? "",
    ...(entry.tags ?? []),
    entry.result.profileLabel,
    entry.result.gradeLabel ?? "",
    entry.normalizedProfile?.shortLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Every tag in use, most-used first then alphabetical — the filter chip row. */
export function collectSavedTags(entries: SavedEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

function timeOf(value: string | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

const COMPARE: Record<SavedSort, (a: SavedEntry, b: SavedEntry) => number> = {
  recent: (a, b) => timeOf(b.timestamp) - timeOf(a.timestamp),
  used: (a, b) => b.useCount - a.useCount || timeOf(b.lastUsedAt) - timeOf(a.lastUsedAt),
  lastUsed: (a, b) => timeOf(b.lastUsedAt) - timeOf(a.lastUsedAt),
  name: (a, b) => a.name.localeCompare(b.name),
};

/**
 * Filter then sort. Pinned entries always lead, sorted among themselves by the
 * same rule — a pin is "keep this at hand", not a separate sort mode. Ties fall
 * back to newest so the order never jitters between renders.
 */
export function filterSortSaved(
  entries: SavedEntry[],
  { search = "", tags = [], sort = "recent" }: SavedQuery = {},
): SavedEntry[] {
  const needle = search.trim().toLowerCase();
  const needles = needle ? needle.split(/\s+/) : [];

  const filtered = entries.filter((entry) => {
    if (tags.length > 0) {
      const own = entry.tags ?? [];
      if (!tags.every((tag) => own.includes(tag))) return false;
    }
    if (needles.length === 0) return true;
    const hay = haystack(entry);
    return needles.every((part) => hay.includes(part));
  });

  const compare = COMPARE[sort] ?? COMPARE.recent;
  return [...filtered].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return compare(a, b) || COMPARE.recent(a, b);
  });
}
