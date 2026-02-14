"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "ferroscale-theme";

export type Theme = "light" | "dark";

/* ---------- tiny external store for theme ---------- */
let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners = [...listeners, cb];
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light"; // SSR always renders light — inline script fixes paint
}

function emitChange() {
  for (const l of listeners) l();
}

/**
 * Manages the app theme (light/dark).
 * - Persists choice to localStorage
 * - Toggles `.dark` class on `<html>`
 * - Defaults to light
 *
 * The synchronous <script> in layout.tsx applies the .dark class before
 * first paint (preventing flash). This hook uses useSyncExternalStore to
 * read the DOM state without hydration mismatch.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* Keep .dark class in sync (covers the toggle case) */
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = getSnapshot() === "light" ? "dark" : "light";

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }

    emitChange();
  }, []);

  return { theme, toggleTheme } as const;
}
