"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { haptic } from "@/lib/haptics";

interface CommandKeypadProps {
  onKey: (ch: string) => void;
  onPriceUnit: () => void;
  /** Insert a price token with an explicitly chosen unit (long-press picker). */
  onPriceUnitPick: (unit: string) => void;
  onBack: () => void;
  /** Hold on backspace: drop the whole token, not one character of it. */
  onBackToken: () => void;
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
  "min-w-0 h-9 rounded-[10px] flex items-center justify-center cursor-pointer select-none transition-colors font-semibold";

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
      onClick={() => {
        haptic("tap");
        onPress();
      }}
      style={{ flex }}
      className={`${KEY_BASE} ${variantClass(variant)} ${mono ? "font-mono" : ""} ${big ? "text-lg" : "text-[15px]"}`}
    >
      {label}
    </button>
  );
}

/**
 * Backspace: tap deletes a character, hold deletes the whole token. Deleting
 * `40x40x3` one keystroke at a time was the keypad's worst moment.
 */
function BackspaceKey({
  onBack,
  onBackToken,
  label,
  holdLabel,
}: {
  onBack: () => void;
  onBackToken: () => void;
  label: string;
  holdLabel: string;
}) {
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={holdLabel}
      onClick={() => {
        if (longFiredRef.current) {
          longFiredRef.current = false;
          return;
        }
        haptic("tap");
        onBack();
      }}
      onPointerDown={() => {
        longFiredRef.current = false;
        timerRef.current = window.setTimeout(() => {
          longFiredRef.current = true;
          haptic("commit");
          onBackToken();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
      style={{ flex: 1.3 }}
      className={`${KEY_BASE} ${variantClass("dim")} text-[15px]`}
    >
      ⌫
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
                  haptic("tap");
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
            haptic("commit");
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
  onBackToken,
  onEnter,
  priceUnitLabel,
  valid,
}: CommandKeypadProps) {
  const t = useTranslations("command");
  return (
    <div
      className="flex-shrink-0 bg-[var(--surface-raised)] border-t border-border-faint px-[7px] pt-1.5"
      // The keypad's background reaches the screen edge; only the keys have to
      // clear the home indicator. Reserving the whole safe-area inset (34px on
      // a notched iPhone) parked the bottom row well above the indicator and
      // left a visible band of empty panel under it. The indicator itself is a
      // ~5pt pill sitting ~8pt up, so ~14px of that inset is slack — take it
      // back, and keep a floor for devices that report no inset at all.
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) - 14px, 6px)" }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          {ROW_NUM.map((k) => (
            <Key key={k} label={k} mono onPress={() => onKey(k)} />
          ))}
        </div>
        <div className="flex gap-1">
          {ROW_TOP.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
        </div>
        <div className="flex gap-1 px-4">
          {ROW_MID.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
        </div>
        <div className="flex gap-1">
          {/* Shows × but types x — the canonical quantity token. */}
          <Key label="×" mono big onPress={() => onKey("x")} flex={1.3} />
          {ROW_BOT.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
          <BackspaceKey
            onBack={onBack}
            onBackToken={onBackToken}
            label={t("keypad.backspace")}
            holdLabel={t("keypad.backspaceHold")}
          />
        </div>
        <div className="flex gap-1">
          <Key label="." mono big onPress={() => onKey(".")} flex={0.8} />
          {/* Takes the width the `>` command key used to hold, so every other
              key in the row keeps the size it had. */}
          <Key label={t("keypad.space")} variant="dim" onPress={() => onKey(" ")} flex={2.9} />
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
