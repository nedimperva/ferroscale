"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "ferroscale-theme";

export type Theme = "light" | "dark" | "system";

/* ---------- helpers for system preference ---------- */
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeToSystemTheme(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => cb();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/* ---------- tiny external store for theme ---------- */
let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners = [...listeners, cb];
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch { /* noop */ }
  return "system"; // default to system
}

function getSnapshot(): Theme {
  return getStoredTheme();
}

function getServerSnapshot(): Theme {
  return "system"; // SSR default (will resolve to light via CSS)
}

function emitChange() {
  for (const l of listeners) l();
}

/**
 * Manages the app theme (light/dark/system).
 * - "system" follows OS preference via prefers-color-scheme
 * - Persists choice to localStorage
 * - Toggles `.dark` class on `<html>` based on resolved theme
 *
 * The synchronous <script> in layout.tsx applies the .dark class before
 * first paint (preventing flash). This hook uses useSyncExternalStore to
 * read the DOM state without hydration mismatch.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* Resolve theme: if "system", get actual preference */
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  /* Keep .dark class in sync (covers the toggle case) */
  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  /* Subscribe to system theme changes when in system mode */
  useEffect(() => {
    if (theme !== "system") return;
    return subscribeToSystemTheme(emitChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch { /* noop */ }

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // system - apply based on current preference
      const sys = getSystemTheme();
      if (sys === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    emitChange();
  }, []);

  return { theme, setTheme, resolvedTheme } as const;
}
