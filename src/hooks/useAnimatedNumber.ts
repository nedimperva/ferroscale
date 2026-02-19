"use client";

import { useEffect, useRef, useState } from "react";

/** Cubic ease-out: fast start, gentle landing. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Returns an animated approximation of `value` that counts toward it
 * over `duration` ms whenever the value changes.
 *
 * - Skips animation on the very first render (avoids counting from 0).
 * - Respects `prefers-reduced-motion` — jumps immediately when motion is
 *   disabled.
 * - Safe to call with NaN / Infinity (passes through unchanged).
 */
export function useAnimatedNumber(value: number, duration = 350): number {
  const [displayed, setDisplayed] = useState(value);

  // Track whether this is the first render and the "from" value.
  const mountedRef = useRef(false);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    // First mount — show value immediately with no animation.
    if (!mountedRef.current) {
      mountedRef.current = true;
      fromRef.current = value;
      return;
    }

    // Bail early for non-finite values.
    if (!isFinite(value)) {
      setDisplayed(value);
      fromRef.current = value;
      return;
    }

    // Respect the OS/browser reduced-motion preference.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(value);
      fromRef.current = value;
      return;
    }

    const startValue = fromRef.current;
    fromRef.current = value;
    const startTime = performance.now();

    cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      setDisplayed(startValue + (value - startValue) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return displayed;
}
