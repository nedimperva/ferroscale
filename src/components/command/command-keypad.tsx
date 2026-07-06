"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface CommandKeypadProps {
  onKey: (ch: string) => void;
  onPriceUnit: () => void;
  /** Insert a price token with an explicitly chosen unit (long-press picker). */
  onPriceUnitPick: (unit: string) => void;
  onBack: () => void;
  onEnter: () => void;
  priceUnitLabel: string;
  valid: boolean;
}

const ROW_NUM = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const ROW_TOP = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW_MID = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW_BOT = ["z", "x", "c", "v", "b", "n", "m"];

/** Alternate price units offered on rate-key long-press. */
const PRICE_UNIT_CHOICES = ["kg", "m", "pc"];
const LONG_PRESS_MS = 450;

interface KeyProps {
  label: string;
  onPress: () => void;
  /** Fired instead of onPress when the key is held (phone-keyboard style). */
  onLongPress?: () => void;
  flex?: number;
  variant?: "default" | "accent" | "dim";
  mono?: boolean;
  big?: boolean;
}

function Key({ label, onPress, onLongPress, flex = 1, variant = "default", mono, big }: KeyProps) {
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const base =
    "min-w-0 h-10 rounded-[10px] flex items-center justify-center cursor-pointer select-none transition-colors";
  let style = "";
  if (variant === "accent") {
    style =
      "bg-[var(--accent)] text-[var(--accent-contrast)] font-bold border border-transparent";
  } else if (variant === "dim") {
    style =
      "bg-[var(--surface)] dark:bg-[#262017] text-muted border border-border-faint";
  } else {
    style =
      "bg-[var(--surface)] dark:bg-[#262017] text-foreground border border-border-faint";
  }
  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  return (
    <button
      type="button"
      onClick={() => {
        // A long-press already handled this gesture; swallow the click.
        if (longFiredRef.current) {
          longFiredRef.current = false;
          return;
        }
        onPress();
      }}
      onPointerDown={
        onLongPress
          ? () => {
              longFiredRef.current = false;
              timerRef.current = window.setTimeout(() => {
                longFiredRef.current = true;
                onLongPress();
              }, LONG_PRESS_MS);
            }
          : undefined
      }
      onPointerUp={onLongPress ? clearTimer : undefined}
      onPointerLeave={onLongPress ? clearTimer : undefined}
      onPointerCancel={onLongPress ? clearTimer : undefined}
      onContextMenu={onLongPress ? (e) => e.preventDefault() : undefined}
      style={{ flex }}
      className={`${base} ${style} ${mono ? "font-mono" : ""} ${big ? "text-lg" : "text-[15px]"} font-semibold`}
    >
      {label}
    </button>
  );
}

export function CommandKeypad({
  onKey,
  onPriceUnit,
  onPriceUnitPick,
  onBack,
  onEnter,
  priceUnitLabel,
  valid,
}: CommandKeypadProps) {
  const t = useTranslations("command");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  return (
    <div
      className="flex-shrink-0 bg-[var(--surface-raised)] border-t border-border-faint px-[7px] pt-[10px]"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {ROW_NUM.map((k) => (
            <Key key={k} label={k} mono onPress={() => onKey(k)} />
          ))}
        </div>
        <div className="flex gap-1.5">
          {ROW_TOP.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
        </div>
        <div className="flex gap-1.5 px-4">
          {ROW_MID.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <Key label="×" mono big onPress={() => onKey("×")} flex={1.3} />
          {ROW_BOT.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
          <Key label="⌫" variant="dim" onPress={onBack} flex={1.3} />
        </div>
        <div className="relative flex gap-1.5">
          {unitPickerOpen && (
            <>
              {/* invisible backdrop: any outside tap closes the picker */}
              <button
                type="button"
                aria-label={t("keypad.closeUnitPicker")}
                className="fixed inset-0 z-40 bg-transparent border-0 cursor-default"
                onClick={() => setUnitPickerOpen(false)}
              />
              <div
                role="menu"
                aria-label={t("keypad.unitPicker")}
                className="absolute bottom-[46px] right-[10%] z-50 flex gap-1 rounded-xl border border-border-faint bg-[var(--surface)] p-1"
                style={{ boxShadow: "var(--panel-shadow-strong, 0 8px 24px rgba(0,0,0,0.25))" }}
              >
                {PRICE_UNIT_CHOICES.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUnitPickerOpen(false);
                      onPriceUnitPick(unit);
                    }}
                    className="h-10 px-3.5 rounded-[9px] font-mono text-[14px] font-bold text-foreground bg-[var(--surface-raised)] border border-border-faint"
                  >
                    /{unit}
                  </button>
                ))}
              </div>
            </>
          )}
          <Key label="." mono big onPress={() => onKey(".")} flex={0.8} />
          <Key label={t("keypad.space")} variant="dim" onPress={() => onKey(" ")} flex={2.5} />
          <Key label="mm" mono onPress={() => onKey("mm")} flex={1.1} />
          <Key label="m" mono big onPress={() => onKey("m")} flex={0.9} />
          <Key
            label={`${priceUnitLabel} ▾`}
            mono
            variant="dim"
            onPress={onPriceUnit}
            onLongPress={() => setUnitPickerOpen(true)}
            flex={1.55}
          />
          <Key
            label="↵"
            variant="accent"
            onPress={onEnter}
            flex={1.4}
          />
        </div>
      </div>
      {!valid && (
        <span className="sr-only">{t("keypad.addLength")}</span>
      )}
    </div>
  );
}
