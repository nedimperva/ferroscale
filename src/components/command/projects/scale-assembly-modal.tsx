"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ScaleAssemblyModal({
  assemblyName,
  itemCount,
  onScale,
  onClose,
}: {
  assemblyName: string;
  itemCount: number;
  onScale: (multiplier: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const [multiplier, setMultiplier] = useState<number>(2);

  const handleConfirm = () => {
    const mult = Number(multiplier);
    if (!Number.isFinite(mult) || mult <= 0) return;
    onScale(mult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border-faint)] bg-[var(--surface)] p-5 shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={t("templates.scaleAssemblyTitle")}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <span>⚡</span>
              <span>{t("templates.scaleAssemblyTitle")}</span>
            </h3>
            <p className="text-[11.5px] text-muted">
              {assemblyName || t("projects.generalSection")} ({itemCount} {t("projects.columns.items")})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Multiplier Buttons */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
            {t("templates.scaleFactorLabel")}:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[2, 3, 4, 0.5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setMultiplier(val)}
                className="py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer"
                style={{
                  background: multiplier === val ? "var(--accent)" : "var(--surface-raised)",
                  color: multiplier === val ? "var(--accent-contrast)" : "var(--foreground)",
                  borderColor: multiplier === val ? "var(--accent)" : "var(--border-faint)",
                }}
              >
                ×{val}
              </button>
            ))}
          </div>
        </div>

        {/* Multiplier Input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value) || 1)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
              if (e.key === "Escape") onClose();
            }}
            autoFocus
            className="flex-1 h-9 rounded-lg border border-[var(--border-faint)] bg-[var(--surface-inset)] px-3 font-mono font-bold text-sm text-foreground text-center outline-none"
          />
        </div>

        <p className="text-[11px] text-muted-faint leading-relaxed">
          {t("templates.scaleAssemblyHint")}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-8 rounded-lg border border-[var(--border-faint)] bg-[var(--surface)] text-xs font-bold text-foreground cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold cursor-pointer"
          >
            {t("templates.applyScale", { mult: multiplier })}
          </button>
        </div>
      </div>
    </div>
  );
}
