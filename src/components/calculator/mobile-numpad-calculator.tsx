"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  CalculationInput,
  CalculationResult,
  LengthUnit,
} from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { triggerHaptic } from "@/lib/haptics";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";

type ActiveField = "length" | "quantity" | "price";

interface Props {
  input: CalculationInput;
  dispatch: (action: CalcAction) => void;
  result: CalculationResult | null;
  isPending: boolean;
  activeFamily: MetalFamilyId;
  normalizedProfile: NormalizedProfileSnapshot | null;
  /** Tap on the Profile chip — open profile picker. */
  onOpenProfilePicker: () => void;
  /** Tap on the Material chip — open material picker. */
  onOpenMaterialPicker: () => void;
  /** Tap on the result card — open the result snap-sheet. */
  onOpenResult: () => void;
  /**
   * Extra bottom padding to leave between the scrollable content and the
   * persistent numpad + bottom tab bar.
   */
  scrollPaddingBottom: string;
}

function fmtNumber(value: number, opts: { maxFrac: number; minFrac?: number }): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: opts.minFrac ?? 0,
    maximumFractionDigits: opts.maxFrac,
    useGrouping: false,
  });
}

function fmtWeight(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0.0";
  if (value >= 10000) return fmtNumber(value, { maxFrac: 0 });
  if (value >= 1000) return fmtNumber(value, { maxFrac: 0 });
  if (value >= 100) return fmtNumber(value, { maxFrac: 1, minFrac: 1 });
  return fmtNumber(value, { maxFrac: 2, minFrac: 1 });
}

function fmtPrice(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function inputAsString(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function appendDigit(buffer: string, digit: string): string {
  if (buffer === "0" || buffer === "") return digit === "." ? "0." : digit;
  if (digit === "." && (buffer.includes(".") || buffer.includes(","))) return buffer;
  return buffer + digit;
}

function appendTripleZero(buffer: string): string {
  if (buffer === "" || buffer === "0") return "0";
  return buffer + "000";
}

function backspace(buffer: string): string {
  if (!buffer) return "";
  const next = buffer.slice(0, -1);
  return next;
}

function parseBuffer(buffer: string): number {
  if (buffer === "" || buffer === ".") return 0;
  const normalized = buffer.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export const MobileNumpadCalculator = memo(function MobileNumpadCalculator({
  input,
  dispatch,
  result,
  isPending,
  activeFamily,
  normalizedProfile,
  onOpenProfilePicker,
  onOpenMaterialPicker,
  onOpenResult,
  scrollPaddingBottom,
}: Props) {
  const t = useTranslations();
  const [activeField, setActiveField] = useState<ActiveField>("length");
  const [buffer, setBuffer] = useState<string>("");

  // When the active field changes, seed the buffer from the current input.
  useEffect(() => {
    if (activeField === "length") setBuffer(inputAsString(input.length.value));
    else if (activeField === "quantity") setBuffer(inputAsString(input.quantity));
    else setBuffer(inputAsString(input.unitPrice));
    // We only want to re-seed when the active field changes (not on every input
    // tick), so the effect deliberately depends only on activeField + the
    // initial values of the underlying inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField]);

  const commitBuffer = useCallback(
    (nextBuffer: string) => {
      setBuffer(nextBuffer);
      const value = parseBuffer(nextBuffer);
      if (activeField === "length") {
        dispatch({ type: "SET_LENGTH_VALUE", value });
      } else if (activeField === "quantity") {
        const integerValue = Math.max(0, Math.floor(value));
        dispatch({ type: "SET_QUANTITY", value: integerValue });
      } else {
        dispatch({ type: "SET_UNIT_PRICE", value });
      }
    },
    [activeField, dispatch],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      triggerHaptic("light");
      // Pieces field is integer-only.
      if (activeField === "quantity" && digit === ".") return;
      commitBuffer(appendDigit(buffer, digit));
    },
    [activeField, buffer, commitBuffer],
  );

  const handleTripleZero = useCallback(() => {
    triggerHaptic("light");
    if (activeField === "quantity") {
      commitBuffer(appendDigit(buffer, "0"));
      return;
    }
    commitBuffer(appendTripleZero(buffer));
  }, [activeField, buffer, commitBuffer]);

  const handleBackspace = useCallback(() => {
    triggerHaptic("light");
    commitBuffer(backspace(buffer));
  }, [buffer, commitBuffer]);

  const handleUnit = useCallback(
    (unit: LengthUnit) => {
      if (activeField !== "length") {
        // For non-length fields, tap the unit key to jump to the length field
        // and switch unit in one motion.
        triggerHaptic("light");
        setActiveField("length");
        dispatch({ type: "SET_LENGTH_UNIT", unit });
        return;
      }
      triggerHaptic("light");
      dispatch({ type: "SET_LENGTH_UNIT", unit });
    },
    [activeField, dispatch],
  );

  const handleField = useCallback((field: ActiveField) => {
    triggerHaptic("light");
    setActiveField(field);
  }, []);

  const totalWeightKg = result?.totalWeightKg ?? 0;
  const grandTotal = result?.grandTotalAmount ?? 0;
  const currencySymbol = CURRENCY_SYMBOLS[input.currency] ?? input.currency;

  const animatedWeight = useAnimatedNumber(totalWeightKg);
  const animatedTotal = useAnimatedNumber(grandTotal);

  const weightDisplay = fmtWeight(animatedWeight);
  const priceDisplay = fmtPrice(animatedTotal);

  const profileLabel =
    normalizedProfile?.shortLabel ?? t(`dataset.profileShort.${input.profileId}`);

  const familyLabel = t(`dataset.families.${activeFamily}`);
  const gradeLabel = result?.gradeLabel ?? input.materialGradeId;

  const summary = useMemo(() => {
    const len = `${fmtNumber(input.length.value || 0, { maxFrac: 3 })} ${input.length.unit}`;
    const qty = `× ${input.quantity || 0}`;
    return `${len} ${qty} · ${gradeLabel}`;
  }, [input.length.value, input.length.unit, input.quantity, gradeLabel]);

  // Buffer-aware display so the user can see in-progress input like "1." while typing.
  const lengthDisplay = activeField === "length" ? buffer || "0" : fmtNumber(input.length.value || 0, { maxFrac: 3 });
  const quantityDisplay = activeField === "quantity" ? buffer || "0" : String(input.quantity || 0);
  const priceFieldDisplay = activeField === "price" ? buffer || "0" : fmtNumber(input.unitPrice ?? 0, { maxFrac: 2 });

  return (
    <div className="flex flex-col gap-3 px-3 pt-2" style={{ paddingBottom: scrollPaddingBottom }}>
      {/* Result card */}
      <button
        type="button"
        onClick={onOpenResult}
        className="panel-base rounded-[1.4rem] bg-surface px-4 pb-3 pt-3 text-left shadow-[var(--panel-shadow-soft)] active:scale-[0.995] transition-transform"
      >
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
            {t("result.totalWeight")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-green-text">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-text" />
            {isPending ? t("mobileCalc.calculating") : t("mobileCalc.live")}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className="text-[3.75rem] font-bold leading-[0.95] tracking-[-0.04em] tabular-nums text-foreground"
            data-testid="mobile-numpad-weight"
          >
            {weightDisplay}
          </span>
          <span className="text-xl font-semibold tracking-tight text-accent">kg</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="truncate text-xs text-foreground-secondary">{summary}</span>
          <span className="shrink-0 font-semibold tabular-nums text-sm text-foreground-secondary">
            {currencySymbol} {priceDisplay}
          </span>
        </div>
      </button>

      {/* Profile + Material chip cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenProfilePicker}
          className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-raised transition-colors"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] bg-surface-raised text-foreground">
            <ProfileGlyph profileId={input.profileId} size="sm" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted">
              {t("mobileCalc.profile")}
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {profileLabel}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenMaterialPicker}
          className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-raised transition-colors"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] bg-surface-emphasis">
            <span className="h-3.5 w-3.5 rounded-[0.3rem] bg-accent" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted">
              {t("mobileCalc.material")}
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {familyLabel} {gradeLabel ? `· ${gradeLabel}` : ""}
            </span>
          </span>
        </button>
      </div>

      {/* Length / Pieces / Price strip */}
      <div className="grid grid-cols-3 gap-1.5">
        <FieldChip
          label={t("mobileCalc.length")}
          value={lengthDisplay}
          unit={input.length.unit}
          active={activeField === "length"}
          onClick={() => handleField("length")}
        />
        <FieldChip
          label={t("mobileCalc.pieces")}
          value={quantityDisplay}
          unit="×"
          active={activeField === "quantity"}
          onClick={() => handleField("quantity")}
        />
        <FieldChip
          label={t("mobileCalc.unitPrice")}
          value={priceFieldDisplay}
          unit={`${currencySymbol}/kg`}
          active={activeField === "price"}
          onClick={() => handleField("price")}
        />
      </div>

      {/* Persistent numpad */}
      <Numpad
        activeUnit={input.length.unit}
        unitsEnabled={activeField === "length"}
        onDigit={handleDigit}
        onTripleZero={handleTripleZero}
        onBackspace={handleBackspace}
        onUnit={handleUnit}
      />
    </div>
  );
});

interface FieldChipProps {
  label: string;
  value: string;
  unit: string;
  active: boolean;
  onClick: () => void;
}

function FieldChip({ label, value, unit, active, onClick }: FieldChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[0.85rem] border px-2.5 py-2 text-left transition-colors ${
        active
          ? "border-accent-border bg-accent-surface"
          : "border-border bg-surface"
      }`}
    >
      <span
        className={`block text-[0.6rem] font-bold uppercase tracking-[0.08em] ${
          active ? "text-accent-text" : "text-muted"
        }`}
      >
        {label}
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        <span className="text-[0.7rem] font-semibold text-muted">{unit}</span>
        {active && (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-4 w-[2px] animate-[aCaret_1s_infinite] self-center bg-accent"
          />
        )}
      </span>
    </button>
  );
}

interface NumpadProps {
  activeUnit: LengthUnit;
  unitsEnabled: boolean;
  onDigit: (digit: string) => void;
  onTripleZero: () => void;
  onBackspace: () => void;
  onUnit: (unit: LengthUnit) => void;
}

function Numpad({ activeUnit, unitsEnabled, onDigit, onTripleZero, onBackspace, onUnit }: NumpadProps) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-surface p-2 shadow-[var(--panel-shadow-soft)]">
      <div className="grid grid-cols-4 gap-1.5">
        <PadKey kind="digit" label="7" onPress={() => onDigit("7")} />
        <PadKey kind="digit" label="8" onPress={() => onDigit("8")} />
        <PadKey kind="digit" label="9" onPress={() => onDigit("9")} />
        <PadKey kind="action" label="⌫" ariaLabel="Backspace" onPress={onBackspace}>
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 2L2 9l5 7h11a2 2 0 002-2V4a2 2 0 00-2-2z" />
            <path d="M11 6l6 6m0-6l-6 6" />
          </svg>
        </PadKey>

        <PadKey kind="digit" label="4" onPress={() => onDigit("4")} />
        <PadKey kind="digit" label="5" onPress={() => onDigit("5")} />
        <PadKey kind="digit" label="6" onPress={() => onDigit("6")} />
        <PadKey kind="unit" label="mm" active={activeUnit === "mm" && unitsEnabled} dim={!unitsEnabled} onPress={() => onUnit("mm")} />

        <PadKey kind="digit" label="1" onPress={() => onDigit("1")} />
        <PadKey kind="digit" label="2" onPress={() => onDigit("2")} />
        <PadKey kind="digit" label="3" onPress={() => onDigit("3")} />
        <PadKey kind="unit" label="cm" active={activeUnit === "cm" && unitsEnabled} dim={!unitsEnabled} onPress={() => onUnit("cm")} />

        <PadKey kind="digit" label="." onPress={() => onDigit(".")} />
        <PadKey kind="digit" label="0" onPress={() => onDigit("0")} />
        <PadKey kind="digit" label="000" small onPress={onTripleZero} />
        <PadKey kind="unit" label="m" active={activeUnit === "m" && unitsEnabled} dim={!unitsEnabled} onPress={() => onUnit("m")} />
      </div>
    </div>
  );
}

interface PadKeyProps {
  kind: "digit" | "action" | "unit";
  label: string;
  small?: boolean;
  active?: boolean;
  dim?: boolean;
  ariaLabel?: string;
  children?: React.ReactNode;
  onPress: () => void;
}

function PadKey({ kind, label, small, active, dim, ariaLabel, children, onPress }: PadKeyProps) {
  const baseFontClasses = small ? "text-base font-semibold" : "text-2xl font-medium";
  const colorClasses =
    kind === "unit"
      ? active
        ? "bg-accent text-white"
        : `bg-surface-pad text-foreground ${dim ? "opacity-60" : ""}`
      : kind === "action"
        ? "bg-surface-pad text-muted"
        : "bg-surface-pad text-foreground";

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={ariaLabel}
      className={`flex h-14 items-center justify-center rounded-2xl tracking-tight tabular-nums active:bg-surface-pad-press active:scale-[0.97] transition-transform ${baseFontClasses} ${colorClasses}`}
      style={{
        boxShadow:
          kind === "unit" && active
            ? "0 6px 12px -6px rgba(120,60,20,0.4)"
            : "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.04)",
      }}
    >
      {children ?? (kind === "unit" ? <span className="text-xs font-bold uppercase tracking-[0.1em]">{label}</span> : label)}
    </button>
  );
}
