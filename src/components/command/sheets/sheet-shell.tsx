"use client";

import { useId, useRef } from "react";
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
}

export function SheetShell({ title, onClose, children, maxWidth, headerAction }: SheetShellProps) {
  const t = useTranslations("command");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // SheetShell only mounts while the sheet is open, so the trap is always on.
  // It focuses the first control, keeps Tab inside, and restores focus to the
  // opener on close.
  useFocusTrap(panelRef, true);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          // The trap keeps focus inside, so this catches every Escape while
          // the sheet is open; stopPropagation shields the window handlers.
          e.stopPropagation();
          onClose();
        }
      }}
    >
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
