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

/** Alternates offered on a long-press ({ins} inserted, {label} shown). */
const LENGTH_UNIT_CHOICES = [
  { ins: "mm", label: "mm" },
  { ins: "cm", label: "cm" },
  { ins: "m", label: "m" },
];
const PRICE_UNIT_CHOICES = [
  { ins: "kg", label: "/kg" },
  { ins: "m", label: "/m" },
  { ins: "pc", label: "/pc" },
];
const LONG_PRESS_MS = 450;

const KEY_BASE =
  "min-w-0 h-10 rounded-[10px] flex items-center justify-center cursor-pointer select-none transition-colors font-semibold";

function variantClass(variant: "default" | "accent" | "dim"): string {
  if (variant === "accent") {
    return "bg-[var(--accent)] text-[var(--accent-contrast)] font-bold border border-transparent";
  }
  if (variant === "dim") {
    return "bg-[var(--surface)] dark:bg-[#262017] text-muted border border-border-faint";
  }
  return "bg-[var(--surface)] dark:bg-[#262017] text-foreground border border-border-faint";
}

interface KeyProps {
  label: string;
  onPress: () => void;
  flex?: number;
  variant?: "default" | "accent" | "dim";
  mono?: boolean;
  big?: boolean;
}

function Key({ label, onPress, flex = 1, variant = "default", mono, big }: KeyProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{ flex }}
      className={`${KEY_BASE} ${variantClass(variant)} ${mono ? "font-mono" : ""} ${big ? "text-lg" : "text-[15px]"}`}
    >
      {label}
    </button>
  );
}

interface PickChoice {
  ins: string;
  label: string;
}

/**
 * A key that inserts a default on tap and, on hold (~450 ms), opens a small
 * picker of alternates anchored above it — the phone-keyboard hold-for-more
 * gesture. `align` keeps the popup off the nearest screen edge.
 */
function HoldPickerKey({
  label,
  onTap,
  choices,
  onPick,
  menuLabel,
  closeLabel,
  align = "right",
  flex = 1,
  variant = "default",
}: {
  label: string;
  onTap: () => void;
  choices: PickChoice[];
  onPick: (ins: string) => void;
  menuLabel: string;
  closeLabel: string;
  align?: "left" | "right";
  flex?: number;
  variant?: "default" | "dim";
}) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="relative" style={{ flex }}>
      {open && (
        <>
          {/* invisible backdrop: any outside tap closes the picker */}
          <button
            type="button"
            aria-label={closeLabel}
            className="fixed inset-0 z-40 bg-transparent border-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label={menuLabel}
            className={`absolute bottom-full mb-1.5 ${align === "right" ? "right-0" : "left-0"} z-50 flex gap-1 rounded-xl border border-border-faint bg-[var(--surface)] p-1`}
            style={{ boxShadow: "var(--panel-shadow-strong, 0 8px 24px rgba(0,0,0,0.25))" }}
          >
            {choices.map((choice) => (
              <button
                key={choice.ins}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onPick(choice.ins);
                }}
                className="h-10 px-3.5 rounded-[9px] font-mono text-[14px] font-bold text-foreground bg-[var(--surface-raised)] border border-border-faint"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          // A long-press already handled this gesture; swallow the click.
          if (longFiredRef.current) {
            longFiredRef.current = false;
            return;
          }
          onTap();
        }}
        onPointerDown={() => {
          longFiredRef.current = false;
          timerRef.current = window.setTimeout(() => {
            longFiredRef.current = true;
            setOpen(true);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full ${KEY_BASE} ${variantClass(variant)} font-mono text-[15px]`}
      >
        {label}
      </button>
    </div>
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
        <div className="flex gap-1.5">
          <Key label="." mono big onPress={() => onKey(".")} flex={0.8} />
          <Key label={t("keypad.space")} variant="dim" onPress={() => onKey(" ")} flex={2.5} />
          {/* Tap = mm; hold to pick mm / cm / m. */}
          <HoldPickerKey
            label="mm ▾"
            onTap={() => onKey("mm")}
            choices={LENGTH_UNIT_CHOICES}
            onPick={(u) => onKey(u)}
            menuLabel={t("keypad.lengthUnitPicker")}
            closeLabel={t("keypad.closeUnitPicker")}
            align="left"
            flex={1.35}
          />
          {/* Tap = default rate token; hold to pick /kg /m /pc. */}
          <HoldPickerKey
            label={`${priceUnitLabel} ▾`}
            onTap={onPriceUnit}
            choices={PRICE_UNIT_CHOICES}
            onPick={(u) => onPriceUnitPick(u)}
            menuLabel={t("keypad.priceUnitPicker")}
            closeLabel={t("keypad.closeUnitPicker")}
            align="right"
            variant="dim"
            flex={1.55}
          />
          <Key label="↵" variant="accent" onPress={onEnter} flex={1.4} />
        </div>
      </div>
      {!valid && (
        <span className="sr-only">{t("keypad.addLength")}</span>
      )}
    </div>
  );
}
