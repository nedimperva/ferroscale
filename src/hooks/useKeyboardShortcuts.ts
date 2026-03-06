"use client";

import { useEffect } from "react";

export interface ShortcutDef {
  key: string;
  mod?: boolean;
  shift?: boolean;
}

export type ShortcutMap = Record<string, ShortcutDef>;

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

function matchesShortcut(e: KeyboardEvent, def: ShortcutDef): boolean {
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (def.mod && !modPressed) return false;
  if (!def.mod && modPressed) return false;
  if (def.shift && !e.shiftKey) return false;
  if (!def.shift && e.shiftKey) return false;
  return e.key.toLowerCase() === def.key.toLowerCase();
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Centralized keyboard shortcut handler.
 * Pass a map of shortcut ID -> callback. Shortcuts are ignored when
 * focus is in an input/textarea element.
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  handlers: Record<string, () => void>,
) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;

      for (const [id, def] of Object.entries(shortcuts)) {
        if (matchesShortcut(e, def) && handlers[id]) {
          e.preventDefault();
          handlers[id]();
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts, handlers]);
}

/** Default shortcut definitions for the app. */
export const APP_SHORTCUTS: ShortcutMap = {
  quickCalc: { key: "k", mod: true },
  history: { key: "h", mod: true },
  settings: { key: ",", mod: true },
  projects: { key: "p", mod: true },
  resetForm: { key: "r", mod: true, shift: true },
  showShortcuts: { key: "?", shift: true },
};

/** Returns a display string for a shortcut, e.g. "⌘K" or "Ctrl+K" */
export function formatShortcut(def: ShortcutDef): string {
  const parts: string[] = [];
  if (def.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (def.shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(def.key.toUpperCase());
  return isMac ? parts.join("") : parts.join("+");
}
