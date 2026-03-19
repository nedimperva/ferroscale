import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createBoolStore,
  createNumberStore,
  createStringStore,
  createSidebarStore,
  normalizeResultPaneCap,
} from "./external-stores";

const mockStorage = new Map<string, string>();

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createBoolStore", () => {
  it("returns default value when key does not exist", () => {
    const store = createBoolStore("test-bool", true);
    expect(store.getSnapshot()).toBe(true);
  });

  it("reads persisted value", () => {
    mockStorage.set("test-bool", "false");
    const store = createBoolStore("test-bool", true);
    expect(store.getSnapshot()).toBe(false);
  });

  it("toggles value and notifies subscribers", () => {
    const store = createBoolStore("toggle-bool", false);
    const listener = vi.fn();
    store.subscribe(listener);

    store.toggle();
    expect(store.getSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    store.toggle();
    expect(store.getSnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe removes listener", () => {
    const store = createBoolStore("unsub-bool", false);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    unsub();
    store.toggle();
    expect(listener).not.toHaveBeenCalled();
  });

  it("getServerSnapshot returns default value", () => {
    const store = createBoolStore("server-bool", true);
    expect(store.getServerSnapshot()).toBe(true);
  });
});

describe("createStringStore", () => {
  it("returns default value when key does not exist", () => {
    const store = createStringStore("test-str", "default");
    expect(store.getSnapshot()).toBe("default");
  });

  it("reads persisted value", () => {
    mockStorage.set("test-str", "custom");
    const store = createStringStore("test-str", "default");
    expect(store.getSnapshot()).toBe("custom");
  });

  it("sets value and notifies subscribers", () => {
    const store = createStringStore("set-str", "initial");
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("updated");
    expect(store.getSnapshot()).toBe("updated");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getServerSnapshot returns default", () => {
    const store = createStringStore("server-str", "default");
    expect(store.getServerSnapshot()).toBe("default");
  });
});

describe("createNumberStore", () => {
  it("returns default value when key does not exist", () => {
    const store = createNumberStore("test-num", 42);
    expect(store.getSnapshot()).toBe(42);
  });

  it("reads persisted value", () => {
    mockStorage.set("test-num", "128");
    const store = createNumberStore("test-num", 42);
    expect(store.getSnapshot()).toBe(128);
  });

  it("falls back to default for non-numeric storage", () => {
    mockStorage.set("test-num", "x");
    const store = createNumberStore("test-num", 7);
    expect(store.getSnapshot()).toBe(7);
  });

  it("sets value and notifies subscribers", () => {
    const store = createNumberStore("set-num", 1);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(99);
    expect(store.getSnapshot()).toBe(99);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getServerSnapshot returns default", () => {
    const store = createNumberStore("server-num", 320);
    expect(store.getServerSnapshot()).toBe(320);
  });
});

describe("normalizeResultPaneCap", () => {
  it("returns nearest allowed cap for invalid stored values", () => {
    expect(normalizeResultPaneCap(380)).toBe(380);
    expect(normalizeResultPaneCap(999)).toBe(480);
    expect(normalizeResultPaneCap(NaN)).toBe(480);
  });
});

describe("createSidebarStore", () => {
  it("defaults to false (not collapsed)", () => {
    const store = createSidebarStore();
    expect(store.getSnapshot()).toBe(false);
  });

  it("reads persisted sidebar state", () => {
    mockStorage.set("ferroscale-sidebar-collapsed", "true");
    const store = createSidebarStore();
    expect(store.getSnapshot()).toBe(true);
  });

  it("toggles sidebar state", () => {
    const store = createSidebarStore();
    store.toggle();
    expect(store.getSnapshot()).toBe(true);
    store.toggle();
    expect(store.getSnapshot()).toBe(false);
  });
});
