"use client";

import { useEffect, useRef, useState } from "react";

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

/**
 * Tween a number toward `target` (easeOutCubic) so the hero metric counts up
 * when a query settles. `resetKey` snaps instead of tweening whenever the scale
 * changes (weight↔price, kg↔t) — a cross-unit tween would be nonsense. Honors
 * prefers-reduced-motion, and never animates the first paint (starts at target).
 */
export function useCountUp(
  target: number | null,
  resetKey: string,
  durationMs = 420,
): number | null {
  const reduce = usePrefersReducedMotion();
  const [value, setValue] = useState<number | null>(target);
  // The value currently on screen — the start point when a new target arrives
  // mid-tween, so interruptions continue from where the eye is.
  const currentRef = useRef<number>(target ?? 0);
  const keyRef = useRef<string>(resetKey);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(null);
      currentRef.current = 0;
      keyRef.current = resetKey;
      return;
    }
    const keyChanged = keyRef.current !== resetKey;
    keyRef.current = resetKey;
    if (reduce || keyChanged || currentRef.current === target) {
      // Snap (no tween) across scale changes or when reduced motion is on.
      setValue(target);
      currentRef.current = target;
      return;
    }
    const from = currentRef.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (target - from) * eased;
      currentRef.current = cur;
      setValue(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, resetKey, reduce, durationMs]);

  return value;
}
