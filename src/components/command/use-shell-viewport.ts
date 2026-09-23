"use client";

import { useEffect, useState } from "react";

/**
 * Which shell this window gets. Two shells, not three:
 *  · phone (<640) → fullscreen with the on-screen keypad and sheets
 *  · everything else (≥640) → the workspace, single-column below 1024
 *
 * 640–1023 used to get a 560px card floating on a background — no session
 * tape, no library, no breakdown — which is exactly an iPad in portrait and
 * a half-width laptop window. It now gets the real thing, laid out for the
 * width it has.
 *
 * All three start false so the first client paint matches the server's.
 */
export function useShellViewport() {
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);
  const [isWideViewport, setIsWideViewport] = useState(false);
  /** Workspace, but narrow: one column, breakdown folded away. */
  const [isCompactDesktop, setIsCompactDesktop] = useState(false);

  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      setIsPhoneViewport(w < 640);
      setIsWideViewport(w >= 640);
      setIsCompactDesktop(w < 1024);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return { isPhoneViewport, isWideViewport, isCompactDesktop };
}
