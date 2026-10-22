"use client";

import { useTranslations } from "next-intl";
import { listUndoEntries, undo, redo, useUndoStack } from "@/hooks/use-undo-stack";
import { SheetShell } from "./sheets/sheet-shell";

/**
 * The undo pair that sits at the right edge of the command band.
 *
 * It is the same stack the destructive actions use, so the button says what
 * it will undo — "Add length 6 m", "Delete project Ograda" — instead of
 * being an anonymous arrow. A disabled button is a promise that there is
 * nothing to do, which is worth making visible.
 */
export function UndoControls({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("command");
  const stack = useUndoStack();
  const size = compact ? 30 : 34;

  const button = (label: string, title: string, onClick: () => void, enabled: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={title}
      aria-label={title}
      className="flex items-center justify-center border border-[var(--border-faint)] bg-[var(--surface)] text-foreground transition-[opacity,background-color] duration-[140ms] hover:bg-[var(--surface-inset)] disabled:opacity-40"
      style={{ width: size, height: size }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
      </svg>
    </button>
  );

  return (
    <div className="flex items-center gap-1">
      {button(
        t("undo.undo"),
        stack.nextUndoLabel ? t("undo.undoLabel", { label: stack.nextUndoLabel }) : t("undo.undo"),
        () => undo(),
        stack.canUndo,
      )}
      <span
        aria-hidden
        className="flex items-center justify-center text-[15px] text-[var(--muted-faint)]"
        style={{ width: size, height: size, transform: "scaleX(-1)" }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </svg>
      </span>
      {button(
        t("undo.redo"),
        stack.nextRedoLabel ? t("undo.redoLabel", { label: stack.nextRedoLabel }) : t("undo.redo"),
        () => redo(),
        stack.canRedo,
      )}
    </div>
  );
}

/**
 * The whole stack, newest first. The five-second toast covers the common case
 * — one delete, one undo — but a stack that can hold a hundred things is only
 * useful if it can be seen.
 */
export function UndoHistorySheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("command");
  // Subscribed so the list refreshes the moment something is undone.
  useUndoStack();
  const entries = listUndoEntries();

  return (
    <SheetShell
      title={t("undo.historyTitle")}
      onClose={onClose}
      size="standard"
      bare
    >
      <div className="flex flex-col">
        {entries.length === 0 ? (
          <p className="py-8 text-center font-mono text-[13px] text-muted">
            {t("undo.historyEmpty")}
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 border-b border-[var(--border-faint)] py-2.5"
            >
              <span className="font-mono text-[10px] uppercase tracking-[1.2px] text-muted-faint">
                {entry.group === "line" ? t("undo.groupLine") : t("undo.groupAction")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                {entry.label}
              </span>
              <span className="font-mono text-[11px] text-muted-faint">
                {new Date(entry.at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </SheetShell>
  );
}
