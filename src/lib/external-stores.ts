/**
 * Tiny external stores for useSyncExternalStore — avoids hydration mismatches
 * while keeping preferences in localStorage.
 */

export function createBoolStore(key: string, defaultValue: boolean) {
  let _listeners: Array<() => void> = [];
  function subscribe(cb: () => void) {
    _listeners = [..._listeners, cb];
    return () => { _listeners = _listeners.filter((l) => l !== cb); };
  }
  function getSnapshot(): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return raw === "true";
    } catch { return defaultValue; }
  }
  function getServerSnapshot(): boolean { return defaultValue; }
  function toggle() {
    const next = !getSnapshot();
    try { localStorage.setItem(key, String(next)); } catch { /* noop */ }
    for (const l of _listeners) l();
  }
  return { subscribe, getSnapshot, getServerSnapshot, toggle };
}

export function createStringStore<T extends string>(key: string, defaultValue: T) {
  let _listeners: Array<() => void> = [];
  function subscribe(cb: () => void) {
    _listeners = [..._listeners, cb];
    return () => { _listeners = _listeners.filter((l) => l !== cb); };
  }
  function getSnapshot(): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return raw as T;
    } catch { return defaultValue; }
  }
  function getServerSnapshot(): T { return defaultValue; }
  function set(value: T) {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
    for (const l of _listeners) l();
  }
  return { subscribe, getSnapshot, getServerSnapshot, set };
}

export function createNumberStore(key: string, defaultValue: number) {
  let _listeners: Array<() => void> = [];
  function subscribe(cb: () => void) {
    _listeners = [..._listeners, cb];
    return () => {
      _listeners = _listeners.filter((l) => l !== cb);
    };
  }
  function getSnapshot(): number {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const n = Number(raw);
      return Number.isFinite(n) ? n : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  function getServerSnapshot(): number {
    return defaultValue;
  }
  function set(value: number) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* noop */
    }
    for (const l of _listeners) l();
  }
  return { subscribe, getSnapshot, getServerSnapshot, set };
}

/** Persisted width (px) of the desktop result column; default matches the pre-shell ~lg column. */
export const desktopResultPaneWidthStore = createNumberStore(
  "ferroscale-desktop-result-pane-px",
  320,
);

export function createSidebarStore() {
  return createBoolStore("ferroscale-sidebar-collapsed", false);
}
