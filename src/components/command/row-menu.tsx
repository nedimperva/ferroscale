"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

/**
 * The "···" overflow menu. Projects and Parts both grew rows with more actions
 * than fit as icons; this is the one dropdown they share, so a destructive
 * action looks the same wherever it appears.
 *
 * The panel is portalled to <body> and positioned in viewport coordinates.
 * Rendering it inside the row put it inside the table's `overflow: hidden`
 * rounding, which clipped it away entirely whenever the list was shorter than
 * the menu — the shorter the list, the less of the menu you could see.
 *
 * It closes on outside pointer-down, on Escape, and after any item runs — a
 * menu still open behind a toast is a menu you have to dismiss twice.
 */

export interface RowMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

const MENU_WIDTH = 196;
const VIEWPORT_MARGIN = 8;
/** 9px padding above and below a 13px line, plus the panel's own border. */
const ITEM_HEIGHT = 35;

export function RowMenu({
  items,
  ariaLabel,
  align = "end",
}: {
  items: RowMenuItem[];
  ariaLabel?: string;
  align?: "start" | "end";
}) {
  const t = useTranslations("command");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /**
   * Placed on the click that opens it, from the trigger's rect and the height
   * the item count implies. Measuring the rendered panel instead would mean
   * painting it once in the wrong place — the flicker is more visible than the
   * pixel or two the estimate can be out by.
   *
   * It sits below the trigger, and flips above when it would run off-screen.
   */
  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) return false;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return false;
      const height = items.length * ITEM_HEIGHT + 2;
      const below = rect.bottom + 5;
      const flip = below + height > window.innerHeight - VIEWPORT_MARGIN;
      const rawLeft = align === "end" ? rect.right - MENU_WIDTH : rect.left;
      setPosition({
        top: flip ? Math.max(VIEWPORT_MARGIN, rect.top - 5 - height) : below,
        left: Math.min(
          Math.max(VIEWPORT_MARGIN, rawLeft),
          window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
        ),
      });
      return true;
    });
  }, [align, items.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // A portalled panel does not travel with its row, so any scroll or resize
    // would leave it stranded mid-page. Closing is honest and cheap.
    const onReflow = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  const panel = open && position && typeof document !== "undefined" && (
    createPortal(
      <div
        ref={panelRef}
        role="menu"
        className="fixed z-[60] rounded-[13px] overflow-hidden"
        style={{
          top: position.top,
          left: position.left,
          width: MENU_WIDTH,
          border: "1px solid var(--border-faint)",
          background: "var(--surface)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              setOpen(false);
              item.onSelect();
            }}
            className="flex w-full items-center text-left font-semibold text-[13px] whitespace-nowrap"
            style={{
              padding: "9px 14px",
              background: "transparent",
              color: item.danger ? "var(--red-text)" : "var(--foreground)",
              cursor: item.disabled ? "default" : "pointer",
              opacity: item.disabled ? 0.4 : 1,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>,
      document.body,
    )
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? t("common.more")}
        className="flex items-center justify-center rounded-[9px] cursor-pointer flex-shrink-0"
        style={{
          width: 30,
          height: 30,
          border: "1px solid var(--border-faint)",
          background: open ? "var(--surface-inset)" : "var(--surface)",
          color: "var(--muted)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {panel}
    </>
  );
}
