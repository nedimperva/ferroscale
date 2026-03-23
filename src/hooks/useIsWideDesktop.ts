"use client";

import { useEffect, useState } from "react";

const WIDE_DESKTOP_BREAKPOINT = 1440; // px

/**
 * Returns `true` when the viewport width is at or above the wide desktop breakpoint.
 * SSR-safe: defaults to `false` on the server.
 */
export function useIsWideDesktop(): boolean {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WIDE_DESKTOP_BREAKPOINT}px)`);
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsWide(event.matches);
    };

    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isWide;
}
