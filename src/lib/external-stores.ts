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

/** Maximum width (px) the result column is allowed to reach when resizing (desktop). */
export const desktopResultPaneMaxCapStore = createNumberStore(
  "ferroscale-desktop-result-max-cap-px",
  480,
);

const THIRD_TAB_VALUES = ["saved", "references"] as const;
export type DesktopThirdTab = (typeof THIRD_TAB_VALUES)[number];

/** Which tab is active in the optional desktop third column. */
export const desktopThirdTabStore = (function createDesktopThirdTabStore() {
  const key = "ferroscale-desktop-third-tab";
  const defaultValue: DesktopThirdTab = "saved";
  let _listeners: Array<() => void> = [];
  function subscribe(cb: () => void) {
    _listeners = [..._listeners, cb];
    return () => {
      _listeners = _listeners.filter((l) => l !== cb);
    };
  }
  function getSnapshot(): DesktopThirdTab {
    try {
      const raw = localStorage.getItem(key);
      if (raw === "saved" || raw === "references") return raw;
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }
  function getServerSnapshot(): DesktopThirdTab {
    return defaultValue;
  }
  function set(value: DesktopThirdTab) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
    for (const l of _listeners) l();
  }
  return { subscribe, getSnapshot, getServerSnapshot, set };
})();

/** Whether the optional third desktop column (Saved / References) is visible. */
export const desktopThirdVisibleStore = createBoolStore(
  "ferroscale-desktop-third-visible",
  false,
);

/** Persisted width (px) of the desktop third column. */
export const desktopThirdPaneWidthStore = createNumberStore(
  "ferroscale-desktop-third-pane-px",
  280,
);

/** Allowed max-width caps for the result column (workspace setting). */
export const RESULT_PANE_CAP_CHOICES = [320, 380, 420, 480] as const;
export type ResultPaneCapPx = (typeof RESULT_PANE_CAP_CHOICES)[number];

export function normalizeResultPaneCap(n: number): ResultPaneCapPx {
  return RESULT_PANE_CAP_CHOICES.includes(n as ResultPaneCapPx) ? (n as ResultPaneCapPx) : 480;
}

export function createSidebarStore() {
  return createBoolStore("ferroscale-sidebar-collapsed", false);
}
