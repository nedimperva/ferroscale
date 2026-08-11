import { describe, it, expect } from "vitest";
import {
  commandKeyHints,
  resolveCommandKey,
  type CommandKeyContext,
} from "./command-keys";

function ctx(overrides: Partial<CommandKeyContext> = {}): CommandKeyContext {
  return {
    key: "",
    code: "",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    partial: "",
    hasGhost: false,
    valid: false,
    caretAtEnd: true,
    caretAtStart: true,
    caretCollapsed: true,
    suggestionCount: 5,
    chipCount: 0,
    historyLength: 0,
    browsingHistory: false,
    ...overrides,
  };
}

describe("resolveCommandKey", () => {
  it("Enter always advances — the meaning of 'forward' is the caller's", () => {
    expect(resolveCommandKey(ctx({ key: "Enter", valid: true }))).toEqual({ type: "advance" });
    expect(resolveCommandKey(ctx({ key: "Enter", valid: false }))).toEqual({ type: "advance" });
  });

  it("⌘S saves and ⌘Enter compares, from anywhere in the line", () => {
    expect(resolveCommandKey(ctx({ key: "s", metaKey: true }))).toEqual({ type: "save" });
    expect(resolveCommandKey(ctx({ key: "S", ctrlKey: true }))).toEqual({ type: "save" });
    expect(resolveCommandKey(ctx({ key: "Enter", metaKey: true }))).toEqual({ type: "compare" });
  });

  it("⌥1–9 picks the nth chip, by physical key", () => {
    expect(resolveCommandKey(ctx({ key: "¡", code: "Digit1", altKey: true }))).toEqual({
      type: "insertSuggestion",
      index: 0,
    });
    expect(resolveCommandKey(ctx({ key: "3", code: "Digit3", altKey: true }))).toEqual({
      type: "insertSuggestion",
      index: 2,
    });
  });

  it("ignores ⌥N past the end of the row", () => {
    expect(
      resolveCommandKey(ctx({ code: "Digit9", altKey: true, suggestionCount: 3 })),
    ).toBeNull();
  });

  it("does not hijack plain digits — they're lengths and quantities", () => {
    expect(resolveCommandKey(ctx({ key: "6", code: "Digit6" }))).toBeNull();
  });

  it("accepts the ghost with Tab, and with → only at a collapsed caret at the end", () => {
    expect(resolveCommandKey(ctx({ key: "Tab", hasGhost: true }))).toEqual({ type: "acceptGhost" });
    expect(resolveCommandKey(ctx({ key: "Tab", hasGhost: false }))).toBeNull();
    expect(resolveCommandKey(ctx({ key: "ArrowRight", hasGhost: true }))).toEqual({
      type: "acceptGhost",
    });
    expect(
      resolveCommandKey(ctx({ key: "ArrowRight", hasGhost: true, caretAtEnd: false })),
    ).toBeNull();
    expect(
      resolveCommandKey(ctx({ key: "ArrowRight", hasGhost: true, caretCollapsed: false })),
    ).toBeNull();
  });

  it("walks history with ↑/↓ and opens the chip row when not browsing", () => {
    expect(resolveCommandKey(ctx({ key: "ArrowUp", historyLength: 2 }))).toEqual({
      type: "historyPrev",
    });
    expect(resolveCommandKey(ctx({ key: "ArrowUp", historyLength: 0 }))).toBeNull();
    expect(resolveCommandKey(ctx({ key: "ArrowDown", browsingHistory: true }))).toEqual({
      type: "historyNext",
    });
    expect(resolveCommandKey(ctx({ key: "ArrowDown" }))).toEqual({ type: "focusChips" });
    expect(resolveCommandKey(ctx({ key: "ArrowDown", suggestionCount: 0 }))).toBeNull();
  });

  it("opens the cheat sheet on ? only when nothing is half-typed", () => {
    expect(resolveCommandKey(ctx({ key: "?" }))).toEqual({ type: "help" });
    expect(resolveCommandKey(ctx({ key: "?", partial: "hea1" }))).toBeNull();
  });

  it("pulls the last chip back on backspace at the start of an empty partial", () => {
    expect(resolveCommandKey(ctx({ key: "Backspace", chipCount: 3 }))).toEqual({
      type: "editLastChip",
    });
    expect(resolveCommandKey(ctx({ key: "Backspace", chipCount: 0 }))).toBeNull();
    expect(
      resolveCommandKey(ctx({ key: "Backspace", chipCount: 3, partial: "6" })),
    ).toBeNull();
    expect(
      resolveCommandKey(ctx({ key: "Backspace", chipCount: 3, caretAtStart: false })),
    ).toBeNull();
  });

  it("Escape clears the line", () => {
    expect(resolveCommandKey(ctx({ key: "Escape" }))).toEqual({ type: "clear" });
  });

  it("leaves ordinary typing alone", () => {
    expect(resolveCommandKey(ctx({ key: "h", code: "KeyH" }))).toBeNull();
    expect(resolveCommandKey(ctx({ key: "x", code: "KeyX", partial: "hea120" }))).toBeNull();
  });
});

describe("commandKeyHints", () => {
  it("says what Enter does at this moment", () => {
    const waiting = commandKeyHints({
      valid: false,
      hasGhost: false,
      suggestionCount: 5,
      historyLength: 0,
    });
    expect(waiting.find((h) => h.keys === "↵")?.labelKey).toBe("insert");

    const ready = commandKeyHints({
      valid: true,
      hasGhost: false,
      suggestionCount: 5,
      historyLength: 0,
    });
    expect(ready.find((h) => h.keys === "↵")?.labelKey).toBe("log");
  });

  it("only offers what applies right now", () => {
    const bare = commandKeyHints({
      valid: false,
      hasGhost: false,
      suggestionCount: 0,
      historyLength: 0,
    });
    expect(bare.map((h) => h.keys)).toEqual(["↵", "?"]);

    const rich = commandKeyHints({
      valid: true,
      hasGhost: true,
      suggestionCount: 6,
      historyLength: 3,
    });
    expect(rich.map((h) => h.keys)).toEqual(["Tab", "↵", "⌥1–9", "⌘S", "↑", "?"]);
  });
});
