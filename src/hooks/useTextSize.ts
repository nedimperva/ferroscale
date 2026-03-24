"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ferroscale-font-size";

export type TextSize = "small" | "medium" | "large";

const CLASS_MAP: Record<TextSize, string | null> = {
  small: "text-size-small",
  medium: null,
  large: "text-size-large",
};

/* ---------- tiny external store ---------- */
let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners = [...listeners, cb];
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getStoredSize(): TextSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "small" || stored === "medium" || stored === "large") return stored;
  } catch { /* noop */ }
  return "medium";
}

function getSnapshot(): TextSize {
  return getStoredSize();
}

function getServerSnapshot(): TextSize {
  return "medium";
}

function emitChange() {
  for (const l of listeners) l();
}

function applyClass(size: TextSize) {
  const el = document.documentElement;
  // Remove all text-size classes first
  el.classList.remove("text-size-small", "text-size-large");
  const cls = CLASS_MAP[size];
  if (cls) el.classList.add(cls);
}

/**
 * Manages the app text size preference (small/medium/large).
 * - Persists to localStorage
 * - Toggles CSS class on `<html>` to scale all rem-based sizes
 *
 * The synchronous <script> in layout.tsx applies the class before
 * first paint (preventing flash). This hook uses useSyncExternalStore
 * to read the stored state without hydration mismatch.
 */
export function useTextSize() {
  const textSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTextSize = useCallback((newSize: TextSize) => {
    try {
      localStorage.setItem(STORAGE_KEY, newSize);
    } catch { /* noop */ }
    applyClass(newSize);
    emitChange();
  }, []);

  return { textSize, setTextSize } as const;
}
