"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { haptic } from "@/lib/haptics";
import { canStepToken, stepToken } from "./token-step";

const LONG_PRESS_MS = 450;

export function TokenChip({
  tok,
  kindClass,
  onEdit,
  onRemove,
  onReplace,
  anchor,
  shadowed,
}: {
  tok: string;
  kindClass: string;
  onEdit: () => void;
  onRemove: () => void;
  onReplace?: (next: string) => void;
  /** Marks the chip the query line scrolls to when an item is opened. */
  anchor?: boolean;
  /** Recognized but inert: its slot was already filled by an earlier token. */
  shadowed?: boolean;
}) {
  const t = useTranslations("command");
  const shadowNote = shadowed ? t("token.shadowed") : null;
  const steppable = Boolean(onReplace && canStepToken(tok));
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const nudge = (direction: 1 | -1) => {
    if (!onReplace) return;
    const next = stepToken(tok, direction);
    if (!next || next === tok) return;
    haptic("tap");
    onReplace(next);
  };

  return (
    <span
      ref={chipRef}
      data-expanded-start={anchor ? "" : undefined}
      className={`relative inline-flex items-stretch flex-shrink-0 font-mono text-sm font-semibold rounded-md ${kindClass}`}
      style={shadowed ? { opacity: 0.55 } : undefined}
    >
      {open &&
        steppable &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={t("common.close")}
              className="fixed inset-0 z-[80] bg-transparent border-0 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div
              role="group"
              aria-label={t("token.stepper", { token: tok })}
              className="fixed z-[90] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-button border border-border-faint bg-[var(--surface)] p-1"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                boxShadow: "var(--panel-shadow-strong, 0 8px 24px rgba(0,0,0,0.25))",
              }}
            >
              <button
                type="button"
                aria-label={t("token.stepDown", { token: tok })}
                onClick={() => nudge(-1)}
                className="h-9 w-9 rounded-[9px] border border-border-faint bg-[var(--surface-raised)] text-base font-bold text-foreground"
              >
                −
              </button>
              <span className="min-w-[2.5rem] px-1 text-center font-mono text-[13px] font-bold">
                {tok}
              </span>
              <button
                type="button"
                aria-label={t("token.stepUp", { token: tok })}
                onClick={() => nudge(1)}
                className="h-9 w-9 rounded-[9px] border border-border-faint bg-[var(--surface-raised)] text-base font-bold text-foreground"
              >
                +
              </button>
            </div>
          </>,
          document.body,
        )}
      <button
        type="button"
        onClick={() => {
          if (longFiredRef.current) {
            longFiredRef.current = false;
            return;
          }
          onEdit();
        }}
        onPointerDown={
          steppable
            ? () => {
                longFiredRef.current = false;
                timerRef.current = window.setTimeout(() => {
                  longFiredRef.current = true;
                  haptic("commit");
                  const rect = chipRef.current?.getBoundingClientRect();
                  if (rect) {
                    setMenuPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
                  }
                  setOpen(true);
                }, LONG_PRESS_MS);
              }
            : undefined
        }
        onPointerUp={steppable ? clearTimer : undefined}
        onPointerLeave={steppable ? clearTimer : undefined}
        onPointerCancel={steppable ? clearTimer : undefined}
        onContextMenu={steppable ? (e) => e.preventDefault() : undefined}
        aria-label={shadowNote ? `${t("token.edit", { token: tok })} — ${shadowNote}` : t("token.edit", { token: tok })}
        title={shadowNote ?? (steppable ? t("token.holdToStep") : undefined)}
        style={shadowed ? { textDecoration: "line-through" } : undefined}
        className="pl-2 pr-0.5 py-1.5 rounded-l-md"
      >
        {tok}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("token.remove", { token: tok })}
        className="flex items-center justify-center w-7 rounded-r-md text-[14px] leading-none hover:bg-[rgba(0,0,0,0.08)] dark:hover:bg-[rgba(255,255,255,0.12)]"
      >
        ×
      </button>
    </span>
  );
}
