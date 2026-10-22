"use client";

import { useEffect, useState } from "react";

/**
 * Which shell this window gets.
 *  · phone (<640) → fullscreen with the on-screen keypad and sheets
 *  · tablet (768–1279) → the workspace, but arranged for a held device
 *  · everything else (≥640) → the workspace, single-column below 1024
 *
 * 640–1023 used to get a 560px card floating on a background — no session
 * tape, no library, no breakdown — which is exactly an iPad in portrait and
 * a half-width laptop window. It now gets the real thing, laid out for the
 * width it has.
 *
 * The tablet is a third thing, not a stretched second one. It is not a phone
 * (no keypad, plenty of width) and not a desk (no mouse, no hover, and no
 * room for a 56px rail beside a 940px ledger). So it keeps the workspace's
 * surfaces and loses its rail: the destinations move to a bar along the
 * bottom, where a thumb can reach them, and the targets grow to the size a
 * finger can hit.
 *
 * All the flags start false so the first client paint matches the server's.
 */
export function useShellViewport() {
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);
  const [isWideViewport, setIsWideViewport] = useState(false);
  /** Workspace, but narrow: one column, breakdown folded away. */
  const [isCompactDesktop, setIsCompactDesktop] = useState(false);
  /** A held device: the workspace, arranged for thumbs. */
  const [isTabletViewport, setIsTabletViewport] = useState(false);

  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      setIsPhoneViewport(w < 640);
      setIsWideViewport(w >= 640);
      setIsCompactDesktop(w < 1024);
      setIsTabletViewport(w >= 768 && w < 1280);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return { isPhoneViewport, isWideViewport, isCompactDesktop, isTabletViewport };
}
