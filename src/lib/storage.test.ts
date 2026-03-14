import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadFromStorage, loadArrayFromStorage, persistToStorage } from "./storage";

const mockStorage = new Map<string, string>();

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadFromStorage", () => {
  it("returns fallback when key does not exist", () => {
    expect(loadFromStorage("missing", 42)).toBe(42);
  });

  it("returns parsed value when key exists", () => {
    mockStorage.set("test-key", JSON.stringify({ name: "foo" }));
    expect(loadFromStorage("test-key", null)).toEqual({ name: "foo" });
  });

  it("returns fallback on JSON parse error", () => {
    mockStorage.set("bad-json", "not-json{");
    expect(loadFromStorage("bad-json", "default")).toBe("default");
  });
});

describe("loadArrayFromStorage", () => {
  it("returns empty array when key does not exist", () => {
    expect(loadArrayFromStorage("missing")).toEqual([]);
  });

  it("returns parsed array", () => {
    mockStorage.set("arr", JSON.stringify([1, 2, 3]));
    expect(loadArrayFromStorage<number>("arr")).toEqual([1, 2, 3]);
  });

  it("returns empty array if stored value is not an array", () => {
    mockStorage.set("obj", JSON.stringify({ a: 1 }));
    expect(loadArrayFromStorage("obj")).toEqual([]);
  });

  it("returns empty array on JSON parse error", () => {
    mockStorage.set("bad", "{invalid");
    expect(loadArrayFromStorage("bad")).toEqual([]);
  });
});

describe("persistToStorage", () => {
  it("persists value as JSON", () => {
    persistToStorage("key", [1, 2]);
    expect(mockStorage.get("key")).toBe("[1,2]");
  });

  it("handles quota exceeded gracefully", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => { throw new DOMException("quota exceeded"); },
      removeItem: () => {},
    });
    expect(() => persistToStorage("key", "value")).not.toThrow();
  });
});
