"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/changelog";
import { loadFromStorage, persistToStorage } from "@/lib/storage";

const KEY = "ferroscale-last-seen-version";

export interface WhatsNewState {
  isOpen: boolean;
  /** The version the user last acknowledged; null before first run. */
  lastSeen: string | null;
  /** Manually reopen (e.g. from Settings). */
  open: () => void;
  /** Dismiss and mark the current version as seen. */
  close: () => void;
}

/**
 * "What's new" gate: shows the changelog once after the app version changes.
 * A brand-new install records the current version silently and is never
 * nagged; upgraders see what shipped since the version they last acknowledged.
 */
export function useWhatsNew(): WhatsNewState {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = loadFromStorage<string | null>(KEY, null);
    setLastSeen(stored); // eslint-disable-line react-hooks/set-state-in-effect
    if (stored == null) {
      persistToStorage(KEY, APP_VERSION);
    } else if (stored !== APP_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setLastSeen(APP_VERSION);
    persistToStorage(KEY, APP_VERSION);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);

  return { isOpen, lastSeen, open, close };
}
