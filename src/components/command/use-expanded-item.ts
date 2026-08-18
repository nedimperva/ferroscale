"use client";

import { useState } from "react";

/**
 * Which `+` item shows its tokens. A new query resets to the last item
 * (caret), unless `lock` ran first with that same next query — that's an
 * edit inside the open item, not a reason to collapse it.
 *
 * All of this is React state (no refs) so the query-change adjustment can
 * happen during render, which is the allowed pattern.
 */
export function useExpandedItem(query: string) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [prevQuery, setPrevQuery] = useState(query);
  const [lockedFor, setLockedFor] = useState<string | null>(null);

  if (query !== prevQuery) {
    setPrevQuery(query);
    if (lockedFor !== query) setExpandedItem(null);
    setLockedFor(null);
  }

  const lockExpanded = (item: number, nextQuery: string) => {
    setLockedFor(nextQuery);
    setExpandedItem(item);
  };

  return { expandedItem, setExpandedItem, lockExpanded };
}
