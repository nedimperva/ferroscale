"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ferroscale-theme";

export type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark") return "dark";
  } catch {
    /* noop */
  }
  return "light";
}

/**
 * Manages the app theme (light/dark).
 * - Persists choice to localStorage
 * - Toggles `.dark` class on `<html>`
 * - Defaults to light
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  /* Sync the .dark class on <html> whenever theme changes */
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme } as const;
}
