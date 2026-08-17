"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { haptic } from "@/lib/haptics";

import type { CommandKeypadMode } from "./keypad-layout";

interface CommandKeypadProps {
  mode: CommandKeypadMode;
  onKey: (ch: string) => void;
  onPriceUnit: () => void;
  /** Insert a price token with an explicitly chosen unit (long-press picker). */
  onPriceUnitPick: (unit: string) => void;
  onBack: () => void;
  /** Hold on backspace: drop the whole token, not one character of it. */
  onBackToken: () => void;
  onEnter: () => void;
  onNew: () => void;
  onTweak: () => void;
  onShare: () => void;
  onLetters: () => void;
  onNumbers: () => void;
  onDone: () => void;
  /** Show 123 on the letter pad — hidden while the next token is still a word. */
  showNumbers: boolean;
  /** Show Done on the number pad — only once the line already computes. */
  showDone: boolean;
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
  "min-w-0 rounded-[10px] flex items-center justify-center cursor-pointer select-none transition-colors font-semibold";

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
  tall?: boolean;
  ariaLabel?: string;
}

function keyHeight(tall?: boolean): string {
  return tall ? "h-11" : "h-9";
}

function Key({
  label,
  onPress,
  flex = 1,
  variant = "default",
  mono,
  big,
  tall,
  ariaLabel,
}: KeyProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        haptic("tap");
        onPress();
      }}
      style={{ flex }}
      className={`${KEY_BASE} ${keyHeight(tall)} ${variantClass(variant)} ${mono ? "font-mono" : ""} ${big ? "text-lg" : "text-[15px]"}`}
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
  tall,
}: {
  onBack: () => void;
  onBackToken: () => void;
  label: string;
  holdLabel: string;
  tall?: boolean;
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
      className={`${KEY_BASE} ${keyHeight(tall)} ${variantClass("dim")} text-[15px]`}
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
  tall,
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
  tall?: boolean;
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
        className={`w-full ${KEY_BASE} ${keyHeight(tall)} ${variantClass(variant)} font-mono text-[15px]`}
      >
        {label}
      </button>
    </div>
  );
}

function KeypadChrome({
  mode,
  children,
}: {
  mode: CommandKeypadMode;
  children: ReactNode;
}) {
  return (
    <div
      data-keypad={mode}
      className="flex-shrink-0 bg-[var(--surface-raised)] border-t border-border-faint px-[7px] pt-1.5"
      // The keypad's background reaches the screen edge; only the keys have to
      // clear the home indicator. Reserving the whole safe-area inset (34px on
      // a notched iPhone) parked the bottom row well above the indicator and
      // left a visible band of empty panel under it. The indicator itself is a
      // ~5pt pill sitting ~8pt up, so ~14px of that inset is slack — take it
      // back, and keep a floor for devices that report no inset at all.
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) - 14px, 6px)" }}
    >
      {children}
    </div>
  );
}

export function CommandKeypad({
  mode,
  onKey,
  onPriceUnit,
  onPriceUnitPick,
  onBack,
  onBackToken,
  onEnter,
  onNew,
  onTweak,
  onShare,
  onLetters,
  onNumbers,
  onDone,
  showNumbers,
  showDone,
  priceUnitLabel,
  valid,
}: CommandKeypadProps) {
  const t = useTranslations("command");

  if (mode === "actions") {
    return (
      <KeypadChrome mode={mode}>
        <div className="flex gap-1.5">
          <Key tall label={t("common.new")} variant="dim" onPress={onNew} />
          <Key
            tall
            label={t("keypad.tweak")}
            variant="accent"
            onPress={onTweak}
            ariaLabel={t("keypad.tweakAria")}
          />
          <Key tall label={t("common.share")} onPress={onShare} />
        </div>
      </KeypadChrome>
    );
  }

  const insertUnit = (unit: string) => onKey(`${unit} `);

  if (mode === "numpad") {
    return (
      <KeypadChrome mode={mode}>
        <div className="flex items-center pb-1 pr-0.5">
          <button
            type="button"
            onClick={() => {
              haptic("tap");
              onLetters();
            }}
            className="rounded-[9px] border border-border-faint bg-[var(--surface)] px-2.5 py-1 text-[12px] font-bold text-muted"
          >
            {t("keypad.letters")}
          </button>
          {showDone && (
            <button
              type="button"
              onClick={() => {
                haptic("tap");
                onDone();
              }}
              className="fs-track-wide ml-auto bg-transparent border-0 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-text)]"
            >
              {t("common.done")}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <Key tall mono label="1" onPress={() => onKey("1")} />
            <Key tall mono label="2" onPress={() => onKey("2")} />
            <Key tall mono label="3" onPress={() => onKey("3")} />
            <BackspaceKey
              tall
              onBack={onBack}
              onBackToken={onBackToken}
              label={t("keypad.backspace")}
              holdLabel={t("keypad.backspaceHold")}
            />
          </div>
          <div className="flex gap-1">
            <Key tall mono label="4" onPress={() => onKey("4")} />
            <Key tall mono label="5" onPress={() => onKey("5")} />
            <Key tall mono label="6" onPress={() => onKey("6")} />
            <Key tall mono big label="×" onPress={() => onKey("x")} />
          </div>
          <div className="flex gap-1">
            <Key tall mono label="7" onPress={() => onKey("7")} />
            <Key tall mono label="8" onPress={() => onKey("8")} />
            <Key tall mono label="9" onPress={() => onKey("9")} />
            <Key tall mono label="0" onPress={() => onKey("0")} />
          </div>
          <div className="flex gap-1">
            <Key
              tall
              variant="dim"
              label={t("keypad.space")}
              onPress={() => onKey(" ")}
              flex={2.2}
            />
            <Key tall mono big label="." onPress={() => onKey(".")} flex={0.8} />
            <HoldPickerKey
              tall
              label="mm ▾"
              onTap={() => insertUnit("mm")}
              choices={LENGTH_UNIT_CHOICES}
              onPick={insertUnit}
              menuLabel={t("keypad.lengthUnitPicker")}
              closeLabel={t("keypad.closeUnitPicker")}
              align="left"
            />
            <HoldPickerKey
              tall
              label={`${priceUnitLabel} ▾`}
              onTap={onPriceUnit}
              choices={PRICE_UNIT_CHOICES}
              onPick={onPriceUnitPick}
              menuLabel={t("keypad.priceUnitPicker")}
              closeLabel={t("keypad.closeUnitPicker")}
              align="right"
              variant="dim"
            />
            <Key tall variant="accent" label="↵" onPress={onEnter} />
          </div>
        </div>
        {!valid && <span className="sr-only">{t("keypad.addLength")}</span>}
      </KeypadChrome>
    );
  }

  return (
    <KeypadChrome mode={mode}>
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
          {showNumbers && (
            <Key
              variant="dim"
              label={t("keypad.numbers")}
              onPress={onNumbers}
              flex={1.15}
            />
          )}
          <Key label="." mono big onPress={() => onKey(".")} flex={0.8} />
          <Key label={t("keypad.space")} variant="dim" onPress={() => onKey(" ")} flex={2.9} />
          <HoldPickerKey
            label="mm ▾"
            onTap={() => insertUnit("mm")}
            choices={LENGTH_UNIT_CHOICES}
            onPick={insertUnit}
            menuLabel={t("keypad.lengthUnitPicker")}
            closeLabel={t("keypad.closeUnitPicker")}
            align="left"
            flex={1.35}
          />
          <HoldPickerKey
            label={`${priceUnitLabel} ▾`}
            onTap={onPriceUnit}
            choices={PRICE_UNIT_CHOICES}
            onPick={onPriceUnitPick}
            menuLabel={t("keypad.priceUnitPicker")}
            closeLabel={t("keypad.closeUnitPicker")}
            align="right"
            variant="dim"
            flex={1.55}
          />
          <Key label="↵" variant="accent" onPress={onEnter} flex={1.4} />
        </div>
      </div>
      {!valid && <span className="sr-only">{t("keypad.addLength")}</span>}
    </KeypadChrome>
  );
}
