"use client";

import { useCallback, useState } from "react";
import type { CommandToastState } from "./command-atoms";

/** The shell's one toast: a plain notice, or one carrying an action. */
export function useCommandToast() {
  const [toast, setToast] = useState<CommandToastState | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ text: msg });
    window.setTimeout(() => setToast(null), 1700);
  }, []);

  /** Toast with an action button (Undo, Name it) — stays up longer. */
  const showActionToast = useCallback(
    (msg: string, action: { label: string; onAction: () => void }) => {
      const entry = { text: msg, ...action };
      setToast(entry);
      window.setTimeout(() => {
        // Only clear if this toast is still the visible one.
        setToast((current) => (current === entry ? null : current));
      }, 5000);
    },
    [],
  );

  return { toast, showToast, showActionToast };
}
