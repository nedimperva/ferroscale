"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ProfileId } from "@/lib/datasets/types";

const STORAGE_KEY = "ferroscale-recent-profiles";
const MAX_RECENT = 4;

let _listeners: Array<() => void> = [];
let _cached: ProfileId[] = [];
let _cachedRaw: string | null = null;

function subscribe(cb: () => void) {
  _listeners = [..._listeners, cb];
  return () => { _listeners = _listeners.filter((l) => l !== cb); };
}

function getSnapshot(): ProfileId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== _cachedRaw) {
      _cachedRaw = raw;
      _cached = raw ? (JSON.parse(raw) as ProfileId[]) : [];
    }
    return _cached;
  } catch { return _cached; }
}

const SERVER_SNAPSHOT: ProfileId[] = [];
function getServerSnapshot(): ProfileId[] { return SERVER_SNAPSHOT; }

function emit() {
  _cachedRaw = null;
  for (const l of _listeners) l();
}

export function useRecentProfiles() {
  const recent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const trackProfile = useCallback((profileId: ProfileId) => {
    const prev = getSnapshot();
    if (prev[0] === profileId) return;
    const filtered = prev.filter((id) => id !== profileId);
    const next = [profileId, ...filtered].slice(0, MAX_RECENT);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
    emit();
  }, []);

  return { recent, trackProfile };
}
