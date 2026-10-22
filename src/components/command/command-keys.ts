/**
 * Key routing for the command line, as one pure function.
 *
 * The rules used to live twice — once in the phone/medium shell, once in the
 * desktop view — and disagreed in detail (Enter meant "log" in one place and
 * "insert the first suggestion" in the other, with nothing on screen saying
 * which). One resolver, one rule set, testable without a DOM.
 */

export type CommandKeyAction =
  /** Insert the nth suggestion chip (0-based). */
  | { type: "insertSuggestion"; index: number }
  /** Take the faint inline completion. */
  | { type: "acceptGhost" }
  /**
   * Enter. One rule: move the line forward — take the pending suggestion when
   * there is one, otherwise log the finished calculation.
   */
  | { type: "advance" }
  | { type: "historyPrev" }
  | { type: "historyNext" }
  /** Move focus into the suggestion row. */
  | { type: "focusChips" }
  /** Pull the last chip back into the input for editing. */
  | { type: "editLastChip" }
  | { type: "clear" }
  | { type: "save" }
  | { type: "compare" }
  | { type: "help" }
  /** Undo the last thing — a line edit or a destructive action. */
  | { type: "undo" }
  /** Redo it. */
  | { type: "redo" }
  /** Compare the line with another one. */
  | { type: "diff" }
  /** Search everything from the bar. */
  | { type: "search" }
  /** The keyboard shortcut list. */
  | { type: "shortcuts" };

export interface CommandKeyContext {
  key: string;
  /** `event.code`, so ⌥1 routes by position rather than by the ⌥ character. */
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  /** The trailing, still-being-typed token. */
  partial: string;
  hasGhost: boolean;
  /** The query parses to a complete calculation. */
  valid: boolean;
  caretAtEnd: boolean;
  caretAtStart: boolean;
  caretCollapsed: boolean;
  suggestionCount: number;
  chipCount: number;
  historyLength: number;
  /** ↑ has already walked into history, so ↓ walks back out of it. */
  browsingHistory: boolean;
}

const DIGIT_CODE = /^Digit([1-9])$/;

export function resolveCommandKey(ctx: CommandKeyContext): CommandKeyAction | null {
  const mod = ctx.metaKey || ctx.ctrlKey;

  // ── shortcuts that work whatever the line contains
  if (mod && ctx.key === "Enter") return { type: "compare" };
  if (mod && ctx.key.toLowerCase() === "s") return { type: "save" };
  // Undo and redo are one stack: the last thing the user did, whatever it
  // was — a line edit, a delete, a project removed.
  if (mod && ctx.key.toLowerCase() === "z") {
    return { type: ctx.shiftKey ? "redo" : "undo" };
  }
  // Ctrl-Y is redo on the keyboards that have no shift to spare.
  if (ctx.ctrlKey && !ctx.metaKey && ctx.key.toLowerCase() === "y") {
    return { type: "redo" };
  }
  if (mod && ctx.key.toLowerCase() === "d") return { type: "diff" };
  if (mod && ctx.key.toLowerCase() === "f") return { type: "search" };
  if (mod && ctx.key === "/") return { type: "shortcuts" };

  // ⌥1–9 picks a chip without leaving the input. Routed by physical key, so
  // it survives the character ⌥ produces on Mac layouts.
  if (ctx.altKey && !mod) {
    const digit = ctx.code.match(DIGIT_CODE);
    if (digit) {
      const index = Number(digit[1]) - 1;
      return index < ctx.suggestionCount ? { type: "insertSuggestion", index } : null;
    }
  }

  if (mod) return null;

  // "?" opens the cheat sheet — only on an empty partial, where it can't be
  // eating a character someone meant to type.
  if (ctx.key === "?" && ctx.partial === "") return { type: "help" };

  if (ctx.key === "Enter") return { type: "advance" };

  if (ctx.key === "Tab" && ctx.hasGhost) return { type: "acceptGhost" };
  if (
    ctx.key === "ArrowRight" &&
    ctx.hasGhost &&
    ctx.caretAtEnd &&
    ctx.caretCollapsed
  ) {
    return { type: "acceptGhost" };
  }

  if (ctx.key === "ArrowUp" && ctx.historyLength > 0) return { type: "historyPrev" };
  if (ctx.key === "ArrowDown") {
    if (ctx.browsingHistory) return { type: "historyNext" };
    return ctx.suggestionCount > 0 ? { type: "focusChips" } : null;
  }

  if (ctx.key === "Escape") return { type: "clear" };

  if (
    ctx.key === "Backspace" &&
    ctx.partial === "" &&
    ctx.chipCount > 0 &&
    ctx.caretAtStart
  ) {
    return { type: "editLastChip" };
  }

  return null;
}

/**
 * What the keys mean *right now*, for the hint strip under the line. Every one
 * of these bindings already existed; none of them were visible anywhere.
 */
export interface CommandKeyHint {
  keys: string;
  /** i18n key under `command.keyHints.*`. */
  labelKey: string;
}

export function commandKeyHints(ctx: {
  valid: boolean;
  hasGhost: boolean;
  suggestionCount: number;
  historyLength: number;
  canUndo?: boolean;
}): CommandKeyHint[] {
  const hints: CommandKeyHint[] = [];
  if (ctx.hasGhost) hints.push({ keys: "Tab", labelKey: "complete" });
  hints.push({
    keys: "↵",
    // Enter always advances; the word for it changes with what's pending.
    labelKey: ctx.valid ? "log" : "insert",
  });
  if (ctx.suggestionCount > 1) hints.push({ keys: "⌥1–9", labelKey: "pick" });
  if (ctx.valid) hints.push({ keys: "⌘S", labelKey: "save" });
  if (ctx.historyLength > 0) hints.push({ keys: "↑", labelKey: "recall" });
  // The hint strip is read at a glance, so it stays short: the full list is
  // one keystroke away (⌘/).
  if (ctx.canUndo) hints.push({ keys: "⌘Z", labelKey: "undo" });
  hints.push({ keys: "?", labelKey: "shortcuts" });
  return hints;
}
