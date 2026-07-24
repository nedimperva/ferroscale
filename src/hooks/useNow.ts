"use client";

import { useEffect, useState } from "react";

/**
 * Current wall-clock time (ms), read after mount so render stays pure.
 * Before the first effect runs it reports 0 — callers that gate a "stale"
 * or "aged" affordance on it simply show nothing until the real time lands,
 * which is the desired first-paint behaviour anyway.
 */
export function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  return now;
}
