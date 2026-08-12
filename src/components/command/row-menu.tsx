"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The "···" overflow menu. Projects and Parts both grew rows with more actions
 * than fit as icons; this is the one dropdown they share, so a destructive
 * action looks the same wherever it appears.
 *
 * It closes on outside pointer-down, on Escape, and after any item runs —
 * a menu that stays open behind a toast is a menu you have to dismiss twice.
 */

export interface RowMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

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
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? t("common.more")}
        className="flex items-center justify-center rounded-[9px] cursor-pointer"
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
      {open && (
        <div
          role="menu"
          className="absolute z-30 rounded-[13px] overflow-hidden"
          style={{
            top: "calc(100% + 5px)",
            [align === "end" ? "right" : "left"]: 0,
            minWidth: 186,
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
        </div>
      )}
    </div>
  );
}
