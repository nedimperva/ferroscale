"use client";

import { useTranslations } from "next-intl";

interface CommandKeypadProps {
  onKey: (ch: string) => void;
  onPriceUnit: () => void;
  onBack: () => void;
  onEnter: () => void;
  priceUnitLabel: string;
  valid: boolean;
}

const ROW_NUM = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const ROW_TOP = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW_MID = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW_BOT = ["z", "x", "c", "v", "b", "n", "m"];

interface KeyProps {
  label: string;
  onPress: () => void;
  flex?: number;
  variant?: "default" | "accent" | "dim";
  mono?: boolean;
  big?: boolean;
}

function Key({ label, onPress, flex = 1, variant = "default", mono, big }: KeyProps) {
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
  return (
    <button
      type="button"
      onClick={onPress}
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
          <Key label="mm" mono onPress={() => onKey("mm")} flex={1.1} />
          <Key label="m" mono big onPress={() => onKey("m")} flex={0.9} />
          <Key label={priceUnitLabel} mono variant="dim" onPress={onPriceUnit} flex={1.55} />
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
