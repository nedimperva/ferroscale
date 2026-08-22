"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SheetShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Cap the panel width and centre it — a three-field form has no business
   *  spanning a 1440px workspace. Full-bleed (the default) stays for lists. */
  maxWidth?: number;
  /** A control that belongs to the sheet's title row (a search toggle). */
  headerAction?: React.ReactNode;
  /** Library and Settings are real pages on the phone — they fill the screen
   *  instead of sitting in an 82% sheet. Result / picker stay a sheet. */
  fullScreen?: boolean;
}

export function SheetShell({
  title,
  onClose,
  children,
  maxWidth,
  headerAction,
  fullScreen,
}: SheetShellProps) {
  const t = useTranslations("command");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // SheetShell only mounts while the sheet is open, so the trap is always on.
  // It focuses the first control, keeps Tab inside, and restores focus to the
  // opener on close.
  useFocusTrap(panelRef, true);

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  if (fullScreen) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-[var(--surface)]" onKeyDown={onEscape}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex min-h-0 flex-1 flex-col px-5"
          style={{
            paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
          }}
        >
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.back")}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-button border border-border-faint bg-[var(--surface-raised)] text-foreground-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h2 id={titleId} className="text-base font-bold text-foreground min-w-0 truncate">
              {title}
            </h2>
            <div className="ml-auto flex items-center gap-2.5">{headerAction}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col" onKeyDown={onEscape}>
      <button
        type="button"
        // Out of the Tab order — keyboard users have the Close button and
        // Escape; the backdrop stays tap/click- and AT-reachable.
        tabIndex={-1}
        aria-label={t("aria.closeSheet")}
        onClick={onClose}
        className="flex-1 bg-[var(--overlay)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-[var(--surface)] border-t border-border-faint rounded-t-3xl px-5 pt-3 pb-6 flex flex-col w-full"
        style={
          maxWidth
            ? { maxHeight: "82%", maxWidth, margin: "0 auto", borderRadius: "24px 24px 0 0" }
            : { maxHeight: "82%" }
        }
      >
        <div className="flex flex-col items-center mb-2">
          <span className="w-9 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id={titleId} className="text-base font-bold text-foreground">{title}</h2>
          <div className="ml-auto flex items-center gap-2.5">
          {headerAction}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground"
          >
            {t("common.close")}
          </button>
          </div>
        </div>
        <div className="overflow-y-auto -mx-1 px-1">{children}</div>
      </div>
    </div>
  );
}
