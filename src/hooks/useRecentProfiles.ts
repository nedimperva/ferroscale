"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ProfileId } from "@/lib/datasets/types";

const STORAGE_KEY = "ferroscale-recent-profiles";
const MAX_RECENT = 4;

let _listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  _listeners = [..._listeners, cb];
  return () => { _listeners = _listeners.filter((l) => l !== cb); };
}

function getSnapshot(): ProfileId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProfileId[]) : [];
  } catch { return []; }
}

function getServerSnapshot(): ProfileId[] { return []; }

function emit() { for (const l of _listeners) l(); }

export function useRecentProfiles() {
  const recent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const trackProfile = useCallback((profileId: ProfileId) => {
    const prev = getSnapshot();
    // Only update if the profile is not already at the top
    if (prev[0] === profileId) return;
    const filtered = prev.filter((id) => id !== profileId);
    const next = [profileId, ...filtered].slice(0, MAX_RECENT);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
    emit();
  }, []);

  return { recent, trackProfile };
}
