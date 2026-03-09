"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";
import { getStandardSizesForProfile } from "@/lib/datasets/standard-sizes";
import type { StandardSize } from "@/lib/datasets/standard-sizes";

interface CustomSize {
  id: string;
  label: string;
  dimensions: Partial<Record<DimensionKey, number>>;
}

interface StandardsComboboxProps {
  profileId: ProfileId;
  onSelect: (dimensions: Partial<Record<DimensionKey, number>>) => void;
  currentDimensions: Record<string, { value: number; unit: string } | undefined>;
  customSizes?: CustomSize[];
  onRemoveCustom?: (id: string) => void;
}

const TOLERANCE = 0.01;

function dimensionsMatch(
  size: StandardSize,
  current: Record<string, { value: number; unit: string } | undefined>,
): boolean {
  return Object.entries(size.dimensions).every(([key, val]) => {
    const cur = current[key];
    return cur != null && Math.abs(cur.value - val) <= TOLERANCE;
  });
}

type ComboItem = StandardSize & { isCustom?: boolean; customId?: string };

function normalizeSearch(s: string): string {
  return s.toLowerCase().replace(/×/g, "x");
}

export const StandardsCombobox = memo(function StandardsCombobox({
  profileId,
  onSelect,
  currentDimensions,
  customSizes = [],
  onRemoveCustom,
}: StandardsComboboxProps) {
  const t = useTranslations("standards");
  const sizes = useMemo(() => getStandardSizesForProfile(profileId), [profileId]);

  const allItems: ComboItem[] = useMemo(() => {
    const customItems: ComboItem[] = customSizes.map((cs) => ({
      profileId,
      label: cs.label,
      dimensions: cs.dimensions,
      isCustom: true,
      customId: cs.id,
    }));
    return [...customItems, ...sizes];
  }, [customSizes, sizes, profileId]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? allItems.filter((s) =>
        normalizeSearch(s.label).includes(normalizeSearch(query.trim())),
      )
    : allItems;

  const handleSelect = useCallback(
    (size: ComboItem) => {
      onSelect(size.dimensions);
      setQuery("");
      setOpen(false);
      setHighlightIdx(-1);
    },
    [onSelect],
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
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIdx((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIdx((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIdx >= 0 && highlightIdx < filtered.length) {
            handleSelect(filtered[highlightIdx]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setQuery("");
          setOpen(false);
          setHighlightIdx(-1);
          break;
      }
    },
    [open, filtered, highlightIdx, handleSelect],
  );

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
        setHighlightIdx(-1);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const pendingHighlightRef = useRef<number | null>(null);
  useEffect(() => {
    if (open && !query) {
      const idx = filtered.findIndex((s) => dimensionsMatch(s, currentDimensions));
      pendingHighlightRef.current = idx >= 0 ? idx : 0;
      const raf = requestAnimationFrame(() => {
        if (pendingHighlightRef.current !== null) {
          setHighlightIdx(pendingHighlightRef.current);
          pendingHighlightRef.current = null;
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, query, filtered, currentDimensions]);

  if (sizes.length === 0 && customSizes.length === 0) return null;

  return (
    <div className="relative mb-1.5" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
          open
            ? "text-blue-text"
            : "text-muted-faint hover:text-foreground-secondary"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
        {t("title")} ({sizes.length}{customSizes.length > 0 ? ` + ${customSizes.length} custom` : ""})
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.95 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{ transformOrigin: "top" }}
            className="absolute left-0 z-50 mt-1 w-72 rounded-lg border border-border bg-surface shadow-lg"
          >
            {/* Search */}
            <div className="border-b border-border-faint px-3 py-2">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("search")}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-faint outline-none"
              />
            </div>

            {/* List */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-64 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted-faint">
                  {t("noResults")}
                </li>
              ) : (
                filtered.map((size, i) => {
                  const isMatched = dimensionsMatch(size, currentDimensions);
                  const isHighlighted = i === highlightIdx;
                  const isCustom = size.isCustom === true;
                  return (
                    <li
                      key={isCustom ? `custom-${size.customId}` : size.label}
                      role="option"
                      aria-selected={isMatched}
                      onMouseEnter={() => setHighlightIdx(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(size);
                      }}
                      className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                        isHighlighted
                          ? "bg-blue-surface text-blue-text"
                          : isCustom
                            ? "bg-purple-surface/30 text-foreground hover:bg-purple-surface/50"
                            : isMatched
                              ? "bg-surface-raised font-medium"
                              : "text-foreground hover:bg-surface-raised"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {size.label}
                        {isCustom && (
                          <span className="rounded bg-purple-surface px-1 py-0.5 text-[9px] font-semibold text-purple-text">
                            Custom
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {isMatched && (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4 text-green-600 dark:text-green-400"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="rounded-full bg-green-100 px-1.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {t("matched")}
                            </span>
                          </>
                        )}
                        {isCustom && onRemoveCustom && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRemoveCustom(size.customId!);
                            }}
                            className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
                            title={t("removeCustom")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
