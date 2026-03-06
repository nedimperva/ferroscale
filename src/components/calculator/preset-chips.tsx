"use client";

import { memo, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleApply = useCallback(
    (preset: DimensionPreset) => {
      triggerHaptic("light");
      onApply(preset);
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
      {presets.map((preset) => (
        <div key={preset.id} className="group relative inline-flex">
          <button
            type="button"
            onClick={() => handleApply(preset)}
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
              onClick={() => handleRemove(preset.id)}
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
                setConfirmDeleteId(preset.id);
                setTimeout(() => setConfirmDeleteId(null), 3000);
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
      ))}

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
