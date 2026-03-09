/**
 * Shared localStorage utilities for hydration-safe load/persist operations.
 * Replaces duplicated patterns across useHistory, useCompare, useProjects, etc.
 */

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadArrayFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

export function onStorageChange<T>(key: string, callback: (value: T) => void): () => void {
  if (typeof window === "undefined") return () => {};
  function handler(e: StorageEvent) {
    if (e.key === key && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as T;
        callback(parsed);
      } catch { /* ignore parse errors */ }
    }
  }
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function createSyncedArrayStore<T>(key: string) {
  let _listeners: Array<() => void> = [];
  let _cache: T[] | null = null;

  function subscribe(cb: () => void) {
    _listeners = [..._listeners, cb];
    const unsub = onStorageChange<T[]>(key, () => {
      _cache = null;
      for (const l of _listeners) l();
    });
    return () => {
      _listeners = _listeners.filter((l) => l !== cb);
      unsub();
    };
  }

  function getSnapshot(): T[] {
    if (_cache !== null) return _cache;
    _cache = loadArrayFromStorage<T>(key);
    return _cache;
  }

  function getServerSnapshot(): T[] {
    return [];
  }

  function set(value: T[]) {
    _cache = value;
    persistToStorage(key, value);
    for (const l of _listeners) l();
  }

  return { subscribe, getSnapshot, getServerSnapshot, set };
}
