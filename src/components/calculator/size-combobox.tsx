"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { StandardSizeOption } from "@/lib/datasets/types";

interface SizeComboboxProps {
  sizes: StandardSizeOption[];
  value: string;
  onChange: (sizeId: string) => void;
  hasIssue?: boolean;
  label?: string;
  hint?: string;
}

export const SizeCombobox = memo(function SizeCombobox({
  sizes,
  value,
  onChange,
  hasIssue = false,
  label,
  hint,
}: SizeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = sizes.find((s) => s.id === value);

  const filtered = query.trim()
    ? sizes.filter((s) =>
        s.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : sizes;

  const handleSelect = useCallback(
    (sizeId: string) => {
      onChange(sizeId);
      setQuery("");
      setOpen(false);
      setHighlightIdx(-1);
      inputRef.current?.blur();
    },
    [onChange],
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
            handleSelect(filtered[highlightIdx].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          setQuery("");
          setOpen(false);
          setHighlightIdx(-1);
          inputRef.current?.blur();
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
    if (open && !query) {
      const idx = filtered.findIndex((s) => s.id === value);
      setHighlightIdx(idx >= 0 ? idx : 0);
    }
  }, [open, query, filtered, value]);

  return (
    <div className="grid gap-1" ref={containerRef}>
      {label && (
        <label
          htmlFor="size"
          className="text-xs font-medium text-foreground-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id="size"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="size-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : selected?.label ?? ""}
          placeholder={open ? "Type to search..." : selected?.label ?? ""}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIdx(0);
          }}
          onKeyDown={handleKeyDown}
          className={`h-10 w-full rounded-lg border bg-surface px-3 pr-9 text-sm font-medium transition-colors focus:border-blue-500 md:h-11 ${
            hasIssue ? "border-red-border" : "border-border-strong"
          }`}
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
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-faint"
          aria-label="Toggle size list"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
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
            <motion.ul
              ref={listRef}
              id="size-listbox"
              role="listbox"
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
              className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted-faint">
                  No matching sizes
                </li>
              ) : (
                filtered.map((s, i) => {
                  const isSelected = s.id === value;
                  const isHighlighted = i === highlightIdx;
                  return (
                    <li
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightIdx(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(s.id);
                      }}
                      className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                        isHighlighted
                          ? "bg-blue-surface text-blue-text"
                          : isSelected
                            ? "bg-surface-raised font-medium"
                            : "text-foreground hover:bg-surface-raised"
                      }`}
                    >
                      <span className="font-medium">{s.label}</span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4 shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
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
      {hint && <p className="text-[11px] text-muted-faint">{hint}</p>}
    </div>
  );
});
