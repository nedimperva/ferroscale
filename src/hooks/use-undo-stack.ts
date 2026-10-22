"use client";

import { useSyncExternalStore } from "react";

/**
 * One undo stack for the whole app.
 *
 * The command bar rewrites the query on every keystroke, which destroys the
 * browser's own undo, so the app keeps its own. The same stack takes the
 * destructive actions — deleting a project, removing a part — because
 * "undo" should mean *undo my last thing*, not "undo my last keystroke".
 * The two kinds sit in one list and are told apart by their group, so the
 * history panel can show them as what they are.
 *
 * Every entry carries its own undo and redo as closures, so an undo restores
 * the thing that was changed — the project with its calculations, the part
 * in its place in the list — and never a blanket restore of storage.
 */

export type UndoGroup = "line" | "action";

export interface UndoEntry {
  id: string;
  /** What happened, in the user's words: "Add length 6 m". */
  label: string;
  group: UndoGroup;
  at: number;
  undo: () => void;
  redo: () => void;
}

export interface UndoSnapshot {
  entries: UndoEntry[];
  canUndo: boolean;
  canRedo: boolean;
  nextUndoLabel: string | null;
  nextRedoLabel: string | null;
}

const MAX_ENTRIES = 100;

let entries: UndoEntry[] = [];
let redoStack: UndoEntry[] = [];
let listeners: Array<() => void> = [];

let snapshot: UndoSnapshot = {
  entries: [],
  canUndo: false,
  canRedo: false,
  nextUndoLabel: null,
  nextRedoLabel: null,
};

/**
 * The snapshot is rebuilt on every change, never on every read. A fresh
 * object from `getSnapshot` would be a different value each time React
 * asked, and `useSyncExternalStore` would keep re-rendering.
 */
function rebuildSnapshot(): void {
  snapshot = {
    entries,
    canUndo: entries.length > 0,
    canRedo: redoStack.length > 0,
    nextUndoLabel: entries.length > 0 ? entries[entries.length - 1].label : null,
    nextRedoLabel: redoStack.length > 0 ? redoStack[redoStack.length - 1].label : null,
  };
}

function emit() {
  rebuildSnapshot();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

/** The stack, read straight from the module so a change re-renders everyone. */
export function getUndoSnapshot(): UndoSnapshot {
  return snapshot;
}

let counter = 0;

/**
 * Put something on the stack. A new action clears the redo stack, the way
 * every editor does: having undone and then done something else, the undone
 * thing is no longer a thing you can redo.
 */
export function pushUndo(entry: { label: string; group: UndoGroup; undo: () => void; redo: () => void }): void {
  counter += 1;
  const next: UndoEntry = {
    id: `undo-${Date.now()}-${counter}`,
    label: entry.label,
    group: entry.group,
    at: Date.now(),
    undo: entry.undo,
    redo: entry.redo,
  };
  entries = [...entries, next].slice(-MAX_ENTRIES);
  redoStack = [];
  emit();
}

export function undo(): UndoEntry | null {
  const entry = entries[entries.length - 1];
  if (!entry) return null;
  entries = entries.slice(0, -1);
  redoStack = [...redoStack, entry].slice(-MAX_ENTRIES);
  entry.undo();
  emit();
  return entry;
}

export function redo(): UndoEntry | null {
  const entry = redoStack[redoStack.length - 1];
  if (!entry) return null;
  redoStack = redoStack.slice(0, -1);
  entries = [...entries, entry].slice(-MAX_ENTRIES);
  entry.redo();
  emit();
  return entry;
}

/** Drop the whole stack — used when the app is reset or the data is replaced. */
export function clearUndo(): void {
  entries = [];
  redoStack = [];
  emit();
}

/**
 * The entries, newest first — the order the history panel shows them in.
 */
export function listUndoEntries(): UndoEntry[] {
  return [...entries].reverse();
}

export function useUndoStack(): UndoSnapshot {
  return useSyncExternalStore(subscribe, getUndoSnapshot, getUndoSnapshot);
}
