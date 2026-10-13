"use client";

import { useEffect, useState } from "react";

/**
 * A "now" that is stable through renders and moves on at local midnight —
 * enough for anything that sorts by day (the history's Today / Yesterday),
 * without reading the clock during render.
 */
export function useDayClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const id = window.setTimeout(() => setNow(Date.now()), midnight.getTime() - Date.now() + 1000);
    return () => window.clearTimeout(id);
  }, [now]);
  return now;
}
