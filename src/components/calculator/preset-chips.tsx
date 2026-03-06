"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DimensionPreset } from "@/hooks/usePresets";
import { triggerHaptic } from "@/lib/haptics";

const VISIBLE_CHIPS = 3;

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasOverflow = presets.length > VISIBLE_CHIPS;
  const visiblePresets = hasOverflow ? presets.slice(0, VISIBLE_CHIPS) : presets;
  const overflowCount = hasOverflow ? presets.length - VISIBLE_CHIPS : 0;

  const filteredPresets = search.trim()
    ? presets.filter((p) => p.label.toLowerCase().includes(search.toLowerCase()))
    : presets;

  // Close popover on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOverflowOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowOpen]);

  const handleApply = useCallback(
    (preset: DimensionPreset) => {
      triggerHaptic("light");
      onApply(preset);
      setOverflowOpen(false);
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Inline chips (up to VISIBLE_CHIPS) */}
      {visiblePresets.map((preset) => (
        <SingleChip
          key={preset.id}
          preset={preset}
          confirmDeleteId={confirmDeleteId}
          onApply={handleApply}
          onConfirmDelete={setConfirmDeleteId}
          onRemove={handleRemove}
          t={t}
        />
      ))}

      {/* Overflow button + popover */}
      {hasOverflow && (
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setOverflowOpen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all ${
              overflowOpen
                ? "border-blue-strong bg-blue-surface text-blue-text"
                : "border-border bg-surface text-foreground-secondary hover:border-blue-strong hover:bg-blue-surface hover:text-blue-text"
            }`}
          >
            +{overflowCount}
          </button>

          {overflowOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-full left-0 z-50 mb-1.5 w-52 rounded-xl border border-border bg-surface-raised shadow-lg"
            >
              {/* Search */}
              <div className="border-b border-border-faint px-2.5 py-2">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("search")}
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-faint outline-none"
                />
              </div>

              {/* Preset list */}
              <div className="max-h-48 overflow-y-auto scroll-native py-1">
                {filteredPresets.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-faint">{t("noResults")}</p>
                ) : (
                  filteredPresets.map((preset) => (
                    <div key={preset.id} className="group flex items-center gap-1 px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleApply(preset)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-foreground-secondary transition-colors hover:bg-blue-surface hover:text-blue-text"
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
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onSave();
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border-strong px-2 py-1 text-[11px] font-medium text-muted transition-all hover:border-blue-strong hover:bg-blue-surface hover:text-blue-text"
        title={t("savePreset")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
        {t("save")}
      </button>
    </div>
  );
});

/* ---- Individual inline chip ---- */

function SingleChip({
  preset,
  confirmDeleteId,
  onApply,
  onConfirmDelete,
  onRemove,
  t,
}: {
  preset: DimensionPreset;
  confirmDeleteId: string | null;
  onApply: (preset: DimensionPreset) => void;
  onConfirmDelete: (id: string | null) => void;
  onRemove: (id: string) => void;
  t: ReturnType<typeof useTranslations<"presets">>;
}) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        onClick={() => onApply(preset)}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground-secondary transition-all hover:border-blue-strong hover:bg-blue-surface hover:text-blue-text"
        title={t("applyPreset")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-muted group-hover:text-blue-text">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {preset.label}
      </button>
      {confirmDeleteId === preset.id ? (
        <button
          type="button"
          onClick={() => onRemove(preset.id)}
          className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-interactive text-white shadow-sm"
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
            onConfirmDelete(preset.id);
            setTimeout(() => onConfirmDelete(null), 3000);
          }}
          className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-surface-raised border border-border-faint text-muted-faint opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          aria-label={t("removePreset")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2 w-2">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
