"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/**
 * The one overlay in the app.
 *
 * It used to be one of two: six sheets went through here and four dialogs were
 * written by hand with `fixed inset-0`. All four of those forgot the focus
 * trap, and only one of them closed on Escape — which is the argument for a
 * component rather than a convention. A caller passes a title, a size and a
 * body; the backdrop, the trap, Escape, the header and the footer are not its
 * to get wrong.
 *
 * On a phone it arrives from the bottom. On a desktop it sits in the middle.
 * That is the only difference, and it is not the caller's decision.
 */
export type OverlaySize = "compact" | "standard" | "wide" | "full";

/** Panel width per size. `full` fills the screen and ignores this. */
const SIZE_WIDTH: Record<Exclude<OverlaySize, "full">, number> = {
  compact: 480,
  standard: 560,
  wide: 900,
};

/**
 * How tall the panel may grow. A form has no business filling the screen; a
 * two-pane browser has nothing to gain from being short.
 */
const SIZE_HEIGHT: Record<Exclude<OverlaySize, "full">, string> = {
  compact: "min(88%, 620px)",
  standard: "min(88%, 760px)",
  wide: "90%",
};

interface SheetShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * compact — a form of a few fields · standard — a list of choices ·
   * wide — a list beside an editor · full — a phone page.
   */
  size?: OverlaySize;
  /** A glyph for the subject the overlay is about, left of the title. */
  icon?: React.ReactNode;
  /** The thing being acted on, under the title. */
  subtitle?: React.ReactNode;
  /** A control that belongs to the title row (a search toggle). */
  headerAction?: React.ReactNode;
  /** Pinned action row along the bottom; scrolls nothing, always reachable. */
  footer?: React.ReactNode;
  /** The body manages its own scrolling and padding (two-pane layouts). */
  bare?: boolean;
  /** @deprecated Pass `size` instead — kept so existing callers still read well. */
  maxWidth?: number;
  /** @deprecated Pass `size="full"`. */
  fullScreen?: boolean;
}

export function SheetShell({
  title,
  onClose,
  children,
  size,
  icon,
  subtitle,
  headerAction,
  footer,
  bare,
  maxWidth,
  fullScreen,
}: SheetShellProps) {
  const t = useTranslations("command");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // The shell only mounts while the overlay is open, so the trap is always on.
  // It focuses the first control, keeps Tab inside, and restores focus to the
  // opener on close.
  useFocusTrap(panelRef, true);

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  const resolved: OverlaySize = size ?? (fullScreen ? "full" : "standard");

  if (resolved === "full") {
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
          {footer && <div className="flex-shrink-0 pt-3">{footer}</div>}
        </div>
      </div>
    );
  }

  const width = maxWidth ?? SIZE_WIDTH[resolved];

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6"
      onKeyDown={onEscape}
    >
      <button
        type="button"
        // Out of the Tab order — keyboard users have the Close button and
        // Escape; the backdrop stays tap/click- and AT-reachable.
        tabIndex={-1}
        aria-label={t("aria.closeSheet")}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--overlay)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full flex flex-col bg-[var(--surface)] border border-border-faint rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{ maxWidth: width, maxHeight: SIZE_HEIGHT[resolved], margin: "0 auto" }}
      >
        {/* The grab handle belongs to the phone, where the sheet slides up. */}
        <div className="flex flex-col items-center pt-2 sm:hidden flex-shrink-0">
          <span className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-start gap-3 px-5 pt-3 pb-3 sm:pt-4 border-b border-border-faint bg-[var(--surface-raised)] flex-shrink-0">
          {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-[15px] font-extrabold text-foreground truncate">
              {title}
            </h2>
            {subtitle}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="w-11 h-11 sm:w-9 sm:h-9 -mt-1 rounded-chip flex items-center justify-center text-muted hover:text-foreground cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {bare ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        )}

        {footer && (
          <div className="flex-shrink-0 px-5 py-3.5 border-t border-border-faint bg-[var(--surface-raised)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
