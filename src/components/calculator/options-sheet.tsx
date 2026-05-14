"use client";

import { memo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { triggerHaptic } from "@/lib/haptics";

export interface OptionItem<T extends string> {
  id: T;
  label: string;
  detail?: string;
}

interface Props<T extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: OptionItem<T>[];
  value: T;
  onSelect: (next: T) => void;
}

/**
 * Generic bottom-sheet option picker. Single-select radio list with
 * the active option tinted in the accent palette.
 */
export function OptionsSheet<T extends string>({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
}: Props<T>) {
  const handle = (id: T) => () => {
    triggerHaptic("light");
    onSelect(id);
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-1.5 pb-2">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={handle(opt.id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? "border-accent-border bg-accent-surface"
                  : "border-border bg-surface"
              }`}
            >
              <span className="flex flex-col">
                <span
                  className={`text-sm font-semibold tracking-tight ${
                    active ? "text-accent-text" : "text-foreground"
                  }`}
                >
                  {opt.label}
                </span>
                {opt.detail && (
                  <span className="mt-0.5 text-2xs text-muted">
                    {opt.detail}
                  </span>
                )}
              </span>
              {active ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              ) : (
                <span className="h-5 w-5 rounded-full border border-border-strong" />
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

export const TypedOptionsSheet = memo(OptionsSheet) as typeof OptionsSheet;
