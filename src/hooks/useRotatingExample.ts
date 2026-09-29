"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./useCountUp";

/**
 * Step through `examples` every `intervalMs` while `active` — the empty
 * command bar's placeholder, which shows a first-time visitor several kinds of
 * line instead of one. Holds on the first example when the bar is in use (so
 * a placeholder coming back always starts at the beginning) and for anyone who
 * asked for reduced motion.
 */
export function useRotatingExample(
  examples: readonly string[],
  active: boolean,
  intervalMs = 3200,
): string {
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const rotating = active && !reduce && examples.length > 1;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % examples.length),
      intervalMs,
    );
    return () => {
      window.clearInterval(id);
      setIndex(0);
    };
  }, [rotating, examples.length, intervalMs]);

  return examples[rotating ? index % examples.length : 0] ?? "";
}
