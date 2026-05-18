"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  CalculationInput,
  CalculationResult,
} from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { triggerHaptic } from "@/lib/haptics";
import { ProfileGlyph } from "@/components/profiles/profile-glyph";
import { SampleBanner } from "@/components/calculator/sample-banner";

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

function fmtNumber(value: number, locale: string, opts: { maxFrac: number; minFrac?: number }): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(locale, {
    minimumFractionDigits: opts.minFrac ?? 0,
    maximumFractionDigits: opts.maxFrac,
    useGrouping: false,
  });
}

/**
 * Weight display formatter. ≥1000 kg auto-switches to tonnes (review §03)
 * so the number stays within the result card on small phones. Caller
 * decides which unit suffix to render via {@link selectWeightUnit}.
 */
function fmtWeight(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0.0";
  if (value >= 1000) {
    const tonnes = value / 1000;
    if (tonnes >= 100) return fmtNumber(tonnes, locale, { maxFrac: 1, minFrac: 1 });
    return fmtNumber(tonnes, locale, { maxFrac: 2, minFrac: 2 });
  }
  if (value >= 100) return fmtNumber(value, locale, { maxFrac: 1, minFrac: 1 });
  return fmtNumber(value, locale, { maxFrac: 2, minFrac: 1 });
}

function selectWeightUnit(value: number): "kg" | "t" {
  return Number.isFinite(value) && value >= 1000 ? "t" : "kg";
}

function fmtPrice(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString(locale, {
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
  const locale = useLocale();
  const [activeField, setActiveField] = useState<ActiveField>("length");
  const [draft, setDraft] = useState<{ field: ActiveField; value: string } | null>(null);

  const currentFieldValue =
    activeField === "length"
      ? input.length.value
      : activeField === "quantity"
        ? input.quantity
        : input.unitPrice;
  const draftValue = draft?.field === activeField ? draft.value : null;
  const buffer =
    draftValue != null && Object.is(parseBuffer(draftValue), Number(currentFieldValue ?? 0))
      ? draftValue
      : inputAsString(currentFieldValue);

  const commitBuffer = useCallback(
    (nextBuffer: string) => {
      setDraft({ field: activeField, value: nextBuffer });
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

  const handleField = useCallback((field: ActiveField) => {
    triggerHaptic("light");
    setActiveField(field);
  }, []);

  const handleClear = useCallback(() => {
    triggerHaptic("light");
    commitBuffer("");
  }, [commitBuffer]);

  const handleNextField = useCallback(() => {
    triggerHaptic("light");
    setActiveField((field) =>
      field === "length" ? "quantity" : field === "quantity" ? "price" : "length",
    );
  }, []);

  const handleDone = useCallback(() => {
    triggerHaptic(result ? "success" : "light");
    if (result) onOpenResult();
  }, [onOpenResult, result]);

  const handleTrySample = useCallback(() => {
    dispatch({ type: "SET_PROFILE_AND_SIZE", profileId: "beam_hea_en", sizeId: "hea120" });
    dispatch({ type: "SET_LENGTH_UNIT", unit: "m" });
    dispatch({ type: "SET_LENGTH_VALUE", value: 6 });
    dispatch({ type: "SET_QUANTITY", value: 2 });
  }, [dispatch]);

  const totalWeightKg = result?.totalWeightKg ?? 0;
  const grandTotal = result?.grandTotalAmount ?? 0;
  const currencySymbol = CURRENCY_SYMBOLS[input.currency] ?? input.currency;

  const animatedWeight = useAnimatedNumber(totalWeightKg);
  const animatedTotal = useAnimatedNumber(grandTotal);

  const weightDisplay = fmtWeight(animatedWeight, locale);
  const weightUnit = selectWeightUnit(animatedWeight);
  const priceDisplay = fmtPrice(animatedTotal, locale);
  const hasResult = result != null && totalWeightKg > 0;

  const profileLabel =
    normalizedProfile?.shortLabel ?? t(`dataset.profileShort.${input.profileId}`);

  // Spec-only profile label — strip the trailing " x L <n> mm" or
  // " · L <n> mm" suffix so the chip just shows e.g. "HEA 120",
  // "L 60x60x6", "SHS 40x40x3". Sheet/plate profiles keep their full
  // label because length is one of the dims (e.g. "SHT 1500x3000x10 mm").
  const profileSpec = useMemo(() => {
    const base = normalizedProfile?.shortLabel ?? profileLabel;
    return base.replace(/\s+[x·]\s*L\s+[\d.]+\s+mm\s*$/i, "").trim();
  }, [normalizedProfile, profileLabel]);

  const familyLabel = t(`dataset.families.${activeFamily}`);
  const gradeLabel = result?.gradeLabel ?? input.materialGradeId;

  const summary = useMemo(() => {
    const len = `${fmtNumber(input.length.value || 0, locale, { maxFrac: 3 })} ${input.length.unit}`;
    const qty = `× ${input.quantity || 0}`;
    return `${len} ${qty} · ${gradeLabel}`;
  }, [input.length.value, input.length.unit, input.quantity, gradeLabel, locale]);

  // Buffer-aware display so the user can see in-progress input like "1." while typing.
  const lengthDisplay = activeField === "length" ? buffer || "0" : fmtNumber(input.length.value || 0, locale, { maxFrac: 3 });
  const quantityDisplay = activeField === "quantity" ? buffer || "0" : String(input.quantity || 0);
  const priceFieldDisplay = activeField === "price" ? buffer || "0" : fmtNumber(input.unitPrice ?? 0, locale, { maxFrac: 2 });

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pt-2"
      style={{
        paddingBottom: `max(${scrollPaddingBottom}, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))`,
      }}
    >
      {/* First-run sample banner — sits above the bottom-anchored stack
          (review §11). Hides once a result exists or the user dismisses. */}
      <SampleBanner hasResult={hasResult} onTrySample={handleTrySample} />

      {/* Bottom-anchored stack — result + controls + numpad. The whole
          group hugs the bottom of the viewport so the thumb can reach
          every key; any leftover height becomes a quiet breathing room
          between the header and the result card. */}
      <button
        type="button"
        onClick={onOpenResult}
        className="panel-base shrink-0 rounded-[var(--radius-card)] bg-surface px-4 pb-2.5 pt-2.5 text-left shadow-[var(--panel-shadow-soft)] [touch-action:manipulation] active:scale-[0.995] transition-transform [will-change:transform]"
      >
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold uppercase tracking-[var(--label-tracking)] text-muted">
            {t("result.totalWeight")}
          </span>
          {hasResult && (
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-green-text">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-text" />
              {isPending ? t("mobileCalc.calculating") : t("mobileCalc.live")}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className="select-text text-[clamp(2.25rem,12vw,3.75rem)] font-bold leading-[0.95] tracking-[-0.04em] tabular-nums text-foreground"
            data-testid="mobile-numpad-weight"
          >
            {weightDisplay}
          </span>
          <span className="text-xl font-semibold tracking-tight text-accent">{weightUnit}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="truncate text-xs text-foreground-secondary">{summary}</span>
          <span className="select-text shrink-0 font-semibold tabular-nums text-sm text-foreground-secondary">
            {currencySymbol} {priceDisplay}
          </span>
        </div>
      </button>

      {/* Profile + Material chip cards — fixed height so the grid
          doesn't reflow when labels change length. */}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenProfilePicker}
          className="flex h-14 items-center gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface px-3 text-left active:bg-surface-raised transition-colors"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pad)] bg-surface-raised text-foreground">
            <ProfileGlyph profileId={input.profileId} size="sm" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.6rem] font-bold uppercase tracking-[var(--label-tracking)] text-muted">
              {t("mobileCalc.profile")}
            </span>
            <span className="truncate text-sm font-semibold tracking-tight tabular-nums text-foreground">
              {profileSpec}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenMaterialPicker}
          className="flex h-14 items-center gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface px-3 text-left active:bg-surface-raised transition-colors"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pad)] bg-surface-emphasis">
            <span className="h-3.5 w-3.5 rounded-[0.3rem] bg-accent" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.6rem] font-bold uppercase tracking-[var(--label-tracking)] text-muted">
              {t("mobileCalc.material")}
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {familyLabel} {gradeLabel ? `· ${gradeLabel}` : ""}
            </span>
          </span>
        </button>
      </div>

      {/* Length / Pieces / Price strip */}
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
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
        onDigit={handleDigit}
        onTripleZero={handleTripleZero}
        onBackspace={handleBackspace}
        onClear={handleClear}
        onNext={handleNextField}
        onDone={handleDone}
        hasUnsavedResult={hasResult}
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
      className={`relative h-[3.75rem] overflow-hidden rounded-[var(--radius-control)] border px-2.5 py-2 text-left transition-colors ${
        active
          ? "border-accent-border bg-accent-surface"
          : "border-border bg-surface"
      }`}
    >
      <span
        className={`block text-[0.6rem] font-bold uppercase tracking-[var(--label-tracking-chip)] ${
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
      </span>
      {/* Caret rendered as overlay so it never reflows the value+unit
          baseline when the chip becomes active. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-2 right-2 inline-block h-4 w-[2px] bg-accent transition-opacity ${
          active ? "animate-[aCaret_1s_infinite] opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

interface NumpadProps {
  onDigit: (digit: string) => void;
  onTripleZero: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onNext: () => void;
  onDone: () => void;
  hasUnsavedResult: boolean;
}

function Numpad({ onDigit, onTripleZero, onBackspace, onClear, onNext, onDone, hasUnsavedResult }: NumpadProps) {
  const t = useTranslations("mobileCalc");

  return (
    <div className="shrink-0 rounded-[var(--radius-card)] border border-border bg-surface p-1.5 shadow-[var(--panel-shadow-soft)]">
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
        <PadKey kind="action" label="C" ariaLabel={t("clear")} onPress={onClear} />

        <PadKey kind="digit" label="1" onPress={() => onDigit("1")} />
        <PadKey kind="digit" label="2" onPress={() => onDigit("2")} />
        <PadKey kind="digit" label="3" onPress={() => onDigit("3")} />
        <PadKey kind="action" label={t("next")} small onPress={onNext} />

        <PadKey kind="digit" label="." onPress={() => onDigit(".")} />
        <PadKey kind="digit" label="0" onPress={() => onDigit("0")} />
        <PadKey kind="digit" label="000" small onPress={onTripleZero} />
        <PadKey
          kind="done"
          label={hasUnsavedResult ? t("save") : t("done")}
          small
          onPress={onDone}
        />
      </div>
    </div>
  );
}

interface PadKeyProps {
  kind: "digit" | "action" | "done";
  label: string;
  small?: boolean;
  ariaLabel?: string;
  children?: React.ReactNode;
  onPress: () => void;
}

function PadKey({ kind, label, small, ariaLabel, children, onPress }: PadKeyProps) {
  const baseFontClasses = small ? "text-base font-semibold" : "text-2xl font-medium";
  const colorClasses =
    kind === "done"
      ? "bg-accent text-white"
      : kind === "action"
        ? "bg-surface-pad text-muted"
        : "bg-surface-pad text-foreground";

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={ariaLabel}
      className={`flex h-[3.25rem] select-none items-center justify-center rounded-2xl tracking-tight tabular-nums [-webkit-tap-highlight-color:transparent] [touch-action:manipulation] [will-change:transform] active:bg-surface-pad-press active:scale-[0.96] transition-transform duration-75 sm:h-14 ${baseFontClasses} ${colorClasses}`}
      style={{
        boxShadow:
          kind === "done"
            ? "0 6px 12px -6px rgba(120,60,20,0.4)"
            : "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.04)",
      }}
    >
      {children ?? label}
    </button>
  );
}
