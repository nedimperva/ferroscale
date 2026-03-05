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

export function createSidebarStore() {
  let _listeners: Array<() => void> = [];
  function subscribe(cb: () => void) {
    _listeners = [..._listeners, cb];
    return () => { _listeners = _listeners.filter((l) => l !== cb); };
  }
  function getSnapshot(): boolean {
    try { return localStorage.getItem("ferroscale-sidebar-collapsed") === "true"; } catch { return false; }
  }
  function getServerSnapshot(): boolean { return false; }
  function toggle() {
    const next = !getSnapshot();
    try { localStorage.setItem("ferroscale-sidebar-collapsed", String(next)); } catch { /* noop */ }
    for (const l of _listeners) l();
  }
  return { subscribe, getSnapshot, getServerSnapshot, toggle };
}
