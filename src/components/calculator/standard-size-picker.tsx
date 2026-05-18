"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";
import type { DimensionPreset } from "@/hooks/usePresets";
import {
  STANDARD_SIZES,
  type StandardSize,
} from "@/lib/datasets/standard-sizes";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  profileId: ProfileId;
  customPresets: DimensionPreset[];
  /** Active dimensions — used to show the matching size as selected. */
  activeDimensions: Partial<Record<DimensionKey, number>>;
  onApply: (dimensions: Partial<Record<DimensionKey, number>>) => void;
}

type Item = {
  id: string;
  label: string;
  dimensions: Partial<Record<DimensionKey, number>>;
  kind: "standard" | "preset";
};

function presetToItem(p: DimensionPreset): Item {
  return {
    id: `preset_${p.id}`,
    label: p.label || "Saved",
    dimensions: p.manualDimensionsMm,
    kind: "preset",
  };
}

function standardToItem(s: StandardSize, idx: number): Item {
  return {
    id: `std_${s.profileId}_${idx}`,
    label: s.label,
    dimensions: s.dimensions,
    kind: "standard",
  };
}

function dimensionsMatch(
  a: Partial<Record<DimensionKey, number>>,
  b: Partial<Record<DimensionKey, number>>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as DimensionKey[]);
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  }
  return true;
}

/**
 * Compact search-select that surfaces built-in standard sizes + the user's
 * saved dimension presets for the current profile. Hidden entirely when
 * neither source has anything to offer.
 */
export const StandardSizePicker = memo(function StandardSizePicker({
  profileId,
  customPresets,
  activeDimensions,
  onApply,
}: Props) {
  const t = useTranslations("standardSizes");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = useMemo<Item[]>(() => {
    const presetItems = customPresets
      .filter((p) => p.profileId === profileId)
      .map(presetToItem);
    const stdItems = STANDARD_SIZES.filter((s) => s.profileId === profileId).map(
      standardToItem,
    );
    return [...presetItems, ...stdItems];
  }, [customPresets, profileId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/×/g, "x");
    if (!needle) return items;
    return items.filter((it) =>
      it.label.toLowerCase().replace(/×/g, "x").includes(needle),
    );
  }, [items, query]);

  const activeItem = useMemo(
    () => items.find((it) => dimensionsMatch(it.dimensions, activeDimensions)),
    [items, activeDimensions],
  );

  const handleSelect = useCallback(
    (item: Item) => {
      triggerHaptic("light");
      onApply(item.dimensions);
      setQuery("");
      setOpen(false);
      setHighlightIdx(0);
      inputRef.current?.blur();
    },
    [onApply],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = filtered[highlightIdx];
        if (target) handleSelect(target);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQuery("");
        setHighlightIdx(0);
        inputRef.current?.blur();
      }
    },
    [open, filtered, highlightIdx, handleSelect],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  if (items.length === 0) return null;

  const display = open ? query : activeItem?.label ?? "";

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label
        htmlFor={`stdsize-${profileId}`}
        className="text-2xs font-bold uppercase tracking-[0.14em] text-muted"
      >
        {t("title")}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={`stdsize-${profileId}`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`stdsize-${profileId}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          value={display}
          placeholder={activeItem?.label ?? t("placeholder")}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setHighlightIdx(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIdx(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 pr-8 text-sm font-medium tabular-nums text-foreground placeholder:text-muted-faint focus:border-accent-border outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (open) {
              setOpen(false);
              setQuery("");
            } else {
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
          aria-label={open ? t("close") : t("open")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-faint hover:text-foreground-secondary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              id={`stdsize-${profileId}-listbox`}
              role="listbox"
              initial={{ opacity: 0, scaleY: 0.96 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.96 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
              className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-faint">
                  {t("noResults")}
                </li>
              ) : (
                filtered.map((item, idx) => {
                  const isActive = activeItem?.id === item.id;
                  const isHighlighted = idx === highlightIdx;
                  return (
                    <li
                      key={item.id}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setHighlightIdx(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                      className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm tabular-nums transition-colors ${
                        isHighlighted
                          ? "bg-accent-surface text-accent-text"
                          : isActive
                            ? "bg-surface-raised font-semibold text-foreground"
                            : "text-foreground hover:bg-surface-raised"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {item.kind === "preset" && (
                          <span
                            aria-label={t("savedHint")}
                            className="shrink-0 text-[0.7rem] text-accent"
                          >
                            ★
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {isActive && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.7 4.15a.75.75 0 01.14 1.05l-8 10.5a.75.75 0 01-1.13.08l-4.5-4.5a.75.75 0 011.06-1.06l3.9 3.89 7.48-9.82a.75.75 0 011.05-.14z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </li>
                  );
                })
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
