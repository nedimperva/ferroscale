import type { CommandSuggestionGroup, CommandSuggestionItem } from "@ferroscale/metal-core";

/**
 * The chip row reads as one flat queue today, even though the items behind it
 * are three different things: what this user actually types, their saved
 * presets, and the catalog. Grouping them makes the row scannable — and makes
 * "your sizes come first" visible rather than merely true.
 */

export const SUGGESTION_GROUP_ORDER: CommandSuggestionGroup[] = [
  "usage",
  "preset",
  "standard",
];

export interface SuggestionGroup {
  group: CommandSuggestionGroup | null;
  items: { item: CommandSuggestionItem; index: number }[];
}

/**
 * Split into contiguous groups, preserving the engine's ranking and each
 * item's absolute index (the index is what ⌥1–9 selects, so it must survive
 * the grouping).
 */
export function groupedSuggestions(items: CommandSuggestionItem[]): SuggestionGroup[] {
  const groups: SuggestionGroup[] = [];
  items.forEach((item, index) => {
    const group = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.group === group) {
      last.items.push({ item, index });
    } else {
      groups.push({ group, items: [{ item, index }] });
    }
  });
  // A single unlabelled run needs no headers at all.
  if (groups.length === 1) return [{ group: null, items: groups[0].items }];
  return groups;
}
