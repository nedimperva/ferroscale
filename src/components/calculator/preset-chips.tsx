"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import type { DimensionPreset } from "@/hooks/usePresets";
import { triggerHaptic } from "@/lib/haptics";

interface PresetChipsProps {
  presets: DimensionPreset[];
  onApply: (preset: DimensionPreset) => void;
  onSave: () => void;
  onRemove: (id: string) => void;
}

export const PresetChips = memo(function PresetChips({
  presets,
  onApply,
  onSave,
  onRemove,
}: PresetChipsProps) {
  const t = useTranslations("presets");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? presets.filter((p) => p.label.toLowerCase().includes(search.toLowerCase()))
    : presets;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset highlight when filter results change
    setHighlightIdx(0);
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const handleApply = useCallback(
    (preset: DimensionPreset) => {
      triggerHaptic("light");
      onApply(preset);
      setOpen(false);
      setSearch("");
    },
    [onApply],
  );

  const handleRemove = useCallback(
    (id: string) => {
      triggerHaptic("light");
      onRemove(id);
      setConfirmDeleteId(null);
    },
    [onRemove],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = filtered[highlightIdx];
        if (target) handleApply(target);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setSearch("");
      }
    },
    [filtered, highlightIdx, handleApply],
  );

  return (
    <div className="flex items-center gap-1.5">
      {/* Favourites trigger */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setOpen((prev) => !prev);
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
            open
              ? "border-blue-strong bg-blue-surface text-blue-text"
              : presets.length > 0
                ? "border-border bg-surface text-foreground-secondary hover:border-blue-strong hover:bg-blue-surface hover:text-blue-text"
                : "border-border-faint bg-surface text-muted-faint hover:border-border hover:text-foreground-secondary"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {t("title")}
          {presets.length > 0 && (
            <span className={`rounded-full px-1 text-2xs font-semibold tabular-nums ${
              open ? "bg-blue-text/10 text-blue-text" : "bg-surface-inset text-muted"
            }`}>
              {presets.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="absolute left-0 z-50 mt-1.5 w-64 rounded-xl border border-border bg-surface-raised shadow-lg"
            >
              {/* Search */}
              {presets.length > 3 && (
                <div className="border-b border-border-faint px-3 py-2">
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("search")}
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-faint outline-none"
                  />
                </div>
              )}

              {/* Preset list */}
              <div className="max-h-56 overflow-y-auto scroll-native py-1">
                {presets.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-muted-faint">
                      No favourites yet
                    </p>
                    <p className="mt-1 text-2xs text-muted-faint">
                      Save current dimensions or type @ in Quick Calc
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-faint">{t("noResults")}</p>
                ) : (
                  filtered.map((preset, idx) => (
                    <div
                      key={preset.id}
                      className={`group flex items-center gap-1 px-2 py-0.5 ${
                        idx === highlightIdx ? "bg-blue-surface/40" : ""
                      }`}
                      onMouseEnter={() => setHighlightIdx(idx)}
                    >
                      <button
                        type="button"
                        onClick={() => handleApply(preset)}
                        className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors ${
                          idx === highlightIdx
                            ? "text-blue-text"
                            : "text-foreground-secondary hover:bg-blue-surface hover:text-blue-text"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-muted">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        <span className="truncate font-medium">{preset.label}</span>
                      </button>
                      {confirmDeleteId === preset.id ? (
                        <button
                          type="button"
                          onClick={() => handleRemove(preset.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-interactive text-white"
                          aria-label={t("confirmRemove")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setConfirmDeleteId(preset.id);
                            setTimeout(() => setConfirmDeleteId(null), 3000);
                          }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-muted"
                          aria-label={t("removePreset")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Save button at bottom */}
              <div className="border-t border-border-faint px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setOpen(false);
                    onSave();
                  }}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="M12 5v14" /><path d="M5 12h14" />
                  </svg>
                  {t("savePreset")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save shortcut (only when panel is closed and no presets exist) */}
      {presets.length === 0 && !open && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onSave();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border-strong px-2 py-1.5 text-xs font-medium text-muted transition-all hover:border-blue-strong hover:bg-blue-surface hover:text-blue-text"
          title={t("savePreset")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          {t("save")}
        </button>
      )}
    </div>
  );
});
