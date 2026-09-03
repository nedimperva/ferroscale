"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DeskIcon } from "../desktop/desk-atoms";
import { SheetShell } from "../sheets/sheet-shell";

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
    <SheetShell
      title={t("templates.scaleAssemblyTitle")}
      onClose={onClose}
      size="compact"
      icon={
        <span className="flex items-center justify-center rounded-chip" style={{ width: 34, height: 34, background: "var(--accent-surface)" }}>
          <DeskIcon name="bolt" stroke="var(--accent-text)" />
        </span>
      }
      subtitle={
        <p className="text-[11.5px] text-muted mt-1 truncate">
          {assemblyName || t("projects.generalSection")} ({itemCount} {t("projects.columns.items")})
        </p>
      }
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 sm:h-10 rounded-button border border-border-faint bg-[var(--surface)] text-xs font-bold text-foreground cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-11 sm:h-10 rounded-button bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold cursor-pointer"
          >
            {t("templates.applyScale", { mult: multiplier })}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
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
                className="py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-2xs"
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

        {/* Multiplier Input with Large Stepper */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMultiplier((m) => Math.max(0.1, Math.round((m - 0.5) * 10) / 10))}
            className="w-11 h-11 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground font-extrabold text-lg active:scale-95 flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <div className="flex-1 relative">
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value) || 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              autoFocus
              className="w-full h-11 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-inset)] px-3 font-mono font-extrabold text-base text-foreground text-center outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setMultiplier((m) => Math.round((m + 0.5) * 10) / 10)}
            className="w-11 h-11 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground font-extrabold text-lg active:scale-95 flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>

        <p className="text-[11px] text-muted-faint leading-relaxed">
          {t("templates.scaleAssemblyHint")}
        </p>

      </div>
    </SheetShell>
  );
}
