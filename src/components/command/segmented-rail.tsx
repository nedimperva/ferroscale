"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { CommandLine } from "@ferroscale/metal-core";
import { fsWeight } from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";
import type { LineChipGroup } from "./line-edit";

/**
 * The items of a `+`-joined line, and which one the command line is editing.
 *
 * Two shapes of one idea — one item at a time, the others a step away:
 *
 * - `stepper` (the phone): ‹ Item 2 of 3 · IPE 200 · 89.6 kg › with a dot per
 *   item. The middle opens a sheet listing every item, with Duplicate, Earlier,
 *   Later and Remove for the one being edited. Removing is a deliberate act in
 *   a sheet, never a stray tap on a 20px ×.
 * - `segments` (the desk): one strip, a segment per item, each as wide as its
 *   share of the line's weight, so the heavy part of an assembly reads at a
 *   glance. Duplicate and Remove sit after the strip, for the selected item.
 *
 * Both are plain buttons with `aria-pressed`, not ARIA tabs: choosing an item
 * does not swap a panel, it points the command line at a different segment.
 */

export interface SegmentedRailProps {
  line: CommandLine;
  groups: LineChipGroup[];
  expandedIndex: number;
  variant: "stepper" | "segments";
  onSelectTab: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onDuplicateItem?: (index: number) => void;
  onMoveItem?: (from: number, to: number) => void;
  onAddItem: () => void;
}

interface RailItem {
  index: number;
  label: string;
  kg: number | null;
  qty: number;
  valid: boolean;
  alias: CommandLine["items"][number]["parse"]["alias"];
}

function railItems(line: CommandLine, groups: LineChipGroup[], newItem: string): RailItem[] {
  return groups.map((group) => {
    const parse = line.items[group.item]?.parse;
    return {
      index: group.item,
      label: parse?.name || group.tokens[0] || newItem,
      kg: parse?.totalKg ?? null,
      qty: parse?.realQty ?? 1,
      // An item still being typed has not failed yet — only flag one that has
      // tokens and does not parse.
      valid: (parse?.valid ?? true) || group.tokens.length === 0,
      alias: parse?.alias ?? null,
    };
  });
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SegmentedRail(props: SegmentedRailProps) {
  const t = useTranslations("command");
  if (props.groups.length <= 1) return null;
  const items = railItems(props.line, props.groups, t("query.newItem"));
  return props.variant === "stepper" ? (
    <Stepper {...props} items={items} />
  ) : (
    <Segments {...props} items={items} />
  );
}

function itemName(t: ReturnType<typeof useTranslations>, item: RailItem): string {
  const base = t("query.expandItem", { index: item.index + 1, name: item.label });
  return item.valid ? base : `${base}. ${t("query.invalidItem", { index: item.index + 1 })}`;
}

function IssueDot({ item }: { item: RailItem }) {
  if (item.valid) return null;
  return (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--accent-surface)" }}
    />
  );
}

function Glyph({ item }: { item: RailItem }) {
  if (!item.alias) return null;
  return (
    <span className="flex shrink-0 items-center text-foreground-secondary" aria-hidden="true">
      <CommandGlyph fam={item.alias.fam} alias={item.alias.alias} size={14} />
    </span>
  );
}

const iconButton =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-[var(--surface-inset)] disabled:pointer-events-none disabled:opacity-30 cursor-pointer";

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

const DuplicateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

/* ───────────────────────── the phone: a stepper and a sheet ───────────────────────── */

function Stepper({
  items,
  expandedIndex,
  onSelectTab,
  onRemoveItem,
  onDuplicateItem,
  onMoveItem,
  onAddItem,
}: SegmentedRailProps & { items: RailItem[] }) {
  const t = useTranslations("command");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const count = items.length;
  const currentIndex = Math.min(expandedIndex, count - 1);
  const current = items[currentIndex];
  const prev = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex < count - 1 ? items[currentIndex + 1] : null;

  const closeSheet = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <div
        role="group"
        aria-label={t("line.items")}
        className="flex h-14 items-center gap-1 border px-1"
        style={{ background: "var(--surface)", borderColor: "var(--border-faint)" }}
      >
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onSelectTab(prev.index)}
          aria-label={prev ? t("query.previousItem", { name: prev.label }) : undefined}
          className={iconButton}
        >
          <Chevron dir="left" />
        </button>

        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          aria-label={t("query.stepperLabel", { index: current.index + 1, count, name: current.label })}
          className="flex h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors hover:bg-[var(--surface-inset)]"
        >
          <span className="flex min-w-0 max-w-full items-center justify-center gap-2 px-1">
            <IssueDot item={current} />
            <span className="truncate text-[15px] font-bold text-foreground">{current.label}</span>
            {current.kg != null && (
              <span className="shrink-0 font-mono text-[13px] text-foreground-secondary">
                {fsWeight(current.kg)} kg
              </span>
            )}
          </span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="mr-1 font-mono text-[12px] leading-none text-muted">
              {current.index + 1}/{count}
            </span>
            {items.map((item) => (
              <span
                key={item.index}
                className="h-2 rounded-full transition-all"
                style={{
                  width: item.index === current.index ? 22 : 8,
                  background:
                    item.index === current.index
                      ? "var(--accent)"
                      : item.valid
                        ? "var(--border)"
                        : "var(--accent-text)",
                }}
              />
            ))}
          </span>
        </button>

        <button
          type="button"
          disabled={!next}
          onClick={() => next && onSelectTab(next.index)}
          aria-label={next ? t("query.nextItem", { name: next.label }) : undefined}
          className={iconButton}
        >
          <Chevron dir="right" />
        </button>

        <button
          type="button"
          onClick={onAddItem}
          aria-label={t("query.addItem")}
          className={`${iconButton} border-l text-[22px] font-medium`}
          style={{ borderColor: "var(--border-faint)", color: "var(--accent-text)" }}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      {open && (
        <ItemSheet
          items={items}
          current={current}
          onClose={closeSheet}
          onSelect={(index) => {
            onSelectTab(index);
            closeSheet();
          }}
          onDuplicate={
            onDuplicateItem
              ? () => {
                  onDuplicateItem(current.index);
                  closeSheet();
                }
              : undefined
          }
          // Moving keeps the sheet open, so an item can be walked several
          // places in a row and the list shows where it has landed.
          onMove={onMoveItem ? (to) => onMoveItem(current.index, to) : undefined}
          onRemove={() => {
            onRemoveItem(current.index);
            closeSheet();
          }}
        />
      )}
    </>
  );
}

function ItemSheet({
  items,
  current,
  onClose,
  onSelect,
  onDuplicate,
  onMove,
  onRemove,
}: {
  items: RailItem[];
  current: RailItem;
  onClose: () => void;
  onSelect: (index: number) => void;
  onDuplicate?: () => void;
  onMove?: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("command");
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus lands on the item being edited when the sheet opens.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
  }, []);

  // Escape closes, ahead of the command bar's own Escape handling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const totalKg = items.reduce((sum, item) => sum + (item.kg ?? 0), 0);
  const last = items.length - 1;
  const action =
    "h-11 border text-[14px] font-semibold text-foreground transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-30";
  const actionStyle = { background: "var(--surface-inset)", borderColor: "var(--border-faint)" };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "rgba(25, 24, 23, 0.35)" }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("line.items")}
        className="relative flex max-h-[80vh] flex-col gap-1 overflow-y-auto px-3 pt-2.5"
        style={{
          background: "var(--surface)",
          paddingBottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
        }}
      >
        <div className="flex justify-center pb-1.5" aria-hidden="true">
          <span className="h-1 w-10 rounded-full" style={{ background: "var(--border)" }} />
        </div>
        <div className="flex items-baseline justify-between px-3 pb-1.5">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
            {t("query.itemsCount", { count: items.length })}
          </span>
          {totalKg > 0 && (
            <span className="font-mono text-[13px] font-semibold text-foreground">{fsWeight(totalKg)} kg</span>
          )}
        </div>

        {items.map((item) => {
          const active = item.index === current.index;
          return (
            <button
              key={item.index}
              type="button"
              aria-pressed={active}
              aria-label={itemName(t, item)}
              onClick={() => onSelect(item.index)}
              className="flex h-[52px] shrink-0 cursor-pointer items-center gap-2.5 px-3 text-left transition-colors"
              style={{ background: active ? "var(--accent-surface)" : "transparent" }}
            >
              <span
                className="font-mono text-[12px] font-bold"
                style={{ color: active ? "var(--accent)" : "var(--muted-faint)" }}
              >
                {item.index + 1}
              </span>
              <Glyph item={item} />
              <IssueDot item={item} />
              <span className="min-w-0 truncate text-[15px] font-semibold text-foreground">{item.label}</span>
              {item.qty > 1 && (
                <span className="shrink-0 font-mono text-[12px] text-foreground-secondary">×{item.qty}</span>
              )}
              <span className="flex-1" />
              {item.kg != null && (
                <span className="shrink-0 font-mono text-[13px] text-foreground">{fsWeight(item.kg)} kg</span>
              )}
            </button>
          );
        })}

        <div className="mt-2 grid grid-cols-4 gap-2">
          <button type="button" disabled={!onDuplicate} onClick={onDuplicate} className={action} style={actionStyle}>
            {t("query.duplicate")}
          </button>
          <button
            type="button"
            disabled={!onMove || current.index === 0}
            onClick={() => onMove?.(current.index - 1)}
            className={action}
            style={actionStyle}
          >
            {t("query.moveEarlier")}
          </button>
          <button
            type="button"
            disabled={!onMove || current.index === last}
            onClick={() => onMove?.(current.index + 1)}
            className={action}
            style={actionStyle}
          >
            {t("query.moveLater")}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("query.removeItem", { index: current.index + 1 })}
            className={action}
            style={{ ...actionStyle, color: "var(--accent-text)" }}
          >
            {t("query.remove")}
          </button>
        </div>
      </div>
    </div>,
    // Only ever opened by a tap, so there is always a document to portal into.
    document.body,
  );
}

/* ───────────────────────── the desk: proportional segments ───────────────────────── */

function Segments({
  items,
  expandedIndex,
  onSelectTab,
  onRemoveItem,
  onDuplicateItem,
  onAddItem,
}: SegmentedRailProps & { items: RailItem[] }) {
  const t = useTranslations("command");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const totalKg = items.reduce((sum, item) => sum + (item.kg ?? 0), 0);
  const currentIndex = Math.min(expandedIndex, items.length - 1);

  useEffect(() => {
    const el = refs.current[currentIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [currentIndex]);

  const move = (to: number) => {
    const target = (to + items.length) % items.length;
    onSelectTab(items[target].index);
    refs.current[target]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(items.length - 1);
    }
  };

  const current = items[currentIndex];

  return (
    <div className="flex items-stretch gap-2">
      <div
        role="group"
        aria-label={t("line.items")}
        title={t("query.weightShare")}
        className="no-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto border"
        style={{ background: "var(--surface-inset)", borderColor: "var(--border-faint)", scrollbarWidth: "none" }}
      >
        {items.map((item, i) => {
          const active = i === currentIndex;
          // Width follows the item's share of the weight, with a floor so a
          // light part is still a segment you can read and hit.
          const share = totalKg > 0 && item.kg != null ? item.kg / totalKg : 1 / items.length;
          return (
            <button
              key={item.index}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              aria-pressed={active}
              tabIndex={active ? 0 : -1}
              aria-label={itemName(t, item)}
              onClick={() => onSelectTab(item.index)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="relative flex h-14 min-w-[11rem] cursor-pointer items-center gap-2 border-r px-3.5 text-left transition-colors last:border-r-0"
              style={{
                flex: `${Math.max(share, 0.22).toFixed(3)} 1 0%`,
                borderColor: "var(--border-faint)",
                background: active ? "var(--surface)" : "transparent",
              }}
            >
              <span
                className="font-mono text-[12px] font-bold"
                style={{ color: active ? "var(--accent)" : "var(--muted-faint)" }}
              >
                {item.index + 1}
              </span>
              <Glyph item={item} />
              <IssueDot item={item} />
              <span
                className={`min-w-0 truncate text-[14px] text-foreground ${active ? "font-bold" : "font-semibold"}`}
                title={item.label}
              >
                {item.label}
              </span>
              {item.qty > 1 && (
                <span className="shrink-0 font-mono text-[12px] text-foreground-secondary">×{item.qty}</span>
              )}
              <span className="flex-1" />
              {item.kg != null && (
                <span className="shrink-0 font-mono text-[12px] text-foreground-secondary">{fsWeight(item.kg)}</span>
              )}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[3px]"
                style={{ background: active ? "var(--accent)" : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddItem}
        className="inline-flex h-14 shrink-0 cursor-pointer items-center gap-1.5 border border-dashed px-4 text-[14px] font-semibold text-foreground-secondary transition-colors hover:text-foreground"
        style={{ borderColor: "var(--border)" }}
      >
        <span aria-hidden="true">+</span>
        {t("query.addItem")}
      </button>
      {onDuplicateItem && (
        <button
          type="button"
          onClick={() => onDuplicateItem(current.index)}
          aria-label={t("query.duplicateItem", { index: current.index + 1 })}
          title={t("query.duplicateItem", { index: current.index + 1 })}
          className="inline-flex h-14 w-12 shrink-0 cursor-pointer items-center justify-center border text-foreground-secondary transition-colors hover:text-foreground"
          style={{ borderColor: "var(--border-faint)" }}
        >
          <DuplicateIcon />
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemoveItem(current.index)}
        aria-label={t("query.removeItem", { index: current.index + 1 })}
        title={t("query.removeItem", { index: current.index + 1 })}
        className="inline-flex h-14 w-12 shrink-0 cursor-pointer items-center justify-center border text-foreground-secondary transition-colors hover:text-[var(--accent-text)]"
        style={{ borderColor: "var(--border-faint)" }}
      >
        <RemoveIcon />
      </button>
    </div>
  );
}
