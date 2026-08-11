"use client";

import { useTranslations } from "next-intl";
import type { PaletteItem } from "./palette";

/**
 * The `>` palette's result list. A vertical list, not the horizontal chip row:
 * these are commands with names, and a name wants to be read down a column.
 * Rendered by both surfaces so a keystroke means the same thing on each.
 */
export function CommandPalette({
  items,
  activeIndex,
  onRun,
  onHover,
  compact,
}: {
  items: PaletteItem[];
  /** Which row Enter would run — moved with ↑/↓ by the caller. */
  activeIndex: number;
  onRun: (item: PaletteItem) => void;
  onHover: (index: number) => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");

  if (items.length === 0) {
    return (
      <div className="font-mono text-muted-faint" style={{ fontSize: compact ? 12 : 13 }}>
        {t("palette.empty")}
      </div>
    );
  }

  return (
    <ul
      className="w-full flex flex-col gap-0.5"
      role="listbox"
      aria-label={t("palette.aria")}
    >
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          <li key={item.id} role="option" aria-selected={active}>
            <button
              type="button"
              // Rows stay out of the Tab order: the caret never leaves the
              // input, and ↑/↓ drives the selection.
              tabIndex={-1}
              disabled={item.disabled}
              onMouseEnter={() => onHover(index)}
              onClick={() => onRun(item)}
              className="w-full flex items-baseline gap-2.5 rounded-[10px] text-left"
              style={{
                padding: compact ? "7px 10px" : "8px 12px",
                background: active ? "var(--surface-inset)" : "transparent",
                cursor: item.disabled ? "default" : "pointer",
                opacity: item.disabled ? 0.4 : 1,
              }}
            >
              <span
                className="font-semibold text-foreground truncate"
                style={{ fontSize: compact ? 12.5 : 13.5 }}
              >
                {item.label}
              </span>
              {item.sub && (
                <span className="font-mono text-[11px] text-muted truncate">{item.sub}</span>
              )}
              <span
                className="ml-auto text-[9.5px] font-bold uppercase text-muted-faint whitespace-nowrap"
                style={{ letterSpacing: 1 }}
              >
                {t(`palette.kind.${item.kind}`)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
