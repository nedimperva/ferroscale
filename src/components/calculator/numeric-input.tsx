import { memo, useState, useRef, useEffect } from "react";
import { formatInputNumber, parseLocaleNumber } from "@/lib/calculator/number-input";
import { triggerHaptic } from "@/lib/haptics";
import { useNumpad } from "./numpad-context";
import { useIsMobile } from "@/hooks/useIsMobile";

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  /**
   * If provided, an empty blur commits this value.
   * If omitted, empty blur restores the previous numeric value.
   */
  emptyValue?: number;
}

export const NumericInput = memo(function NumericInput({
  value,
  onValueChange,
  emptyValue,
  onBlur,
  onFocus,
  ...rest
}: NumericInputProps) {
  const [draft, setDraft] = useState(() => formatInputNumber(value));
  const [focused, setFocused] = useState(false);
  const inputValue = focused ? draft : formatInputNumber(value);
  
  const numpad = useNumpad();
  const isMobile = useIsMobile();
  const shouldUseNumpad = isMobile && numpad !== null;

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft to external changes when not focused
  useEffect(() => {
    if (!focused) {
      setDraft(formatInputNumber(value));
    }
  }, [value, focused]);

  const commitValue = (val: string) => {
    const trimmed = val.trim();
    if (trimmed === "") {
      if (emptyValue !== undefined) {
        onValueChange(emptyValue);
        setDraft(formatInputNumber(emptyValue));
      } else {
        setDraft(formatInputNumber(value));
      }
      return;
    }
    const parsed = parseLocaleNumber(trimmed);
    if (parsed !== null) {
      onValueChange(parsed);
      setDraft(formatInputNumber(parsed));
    } else {
      setDraft(formatInputNumber(value));
    }
  };

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      suppressHydrationWarning
      inputMode={shouldUseNumpad ? "none" : rest.inputMode || "decimal"}
      value={inputValue}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const parsed = parseLocaleNumber(next);
        if (parsed !== null) {
          triggerHaptic('light');
          onValueChange(parsed);
        }
      }}
      onFocus={(event) => {
        setDraft(formatInputNumber(value));
        setFocused(true);
        onFocus?.(event);
        
        if (shouldUseNumpad) {
          numpad.openNumpad({
            value: formatInputNumber(value),
            onChange: (newVal) => {
              setDraft(newVal);
              const parsed = parseLocaleNumber(newVal);
              if (parsed !== null) {
                onValueChange(parsed);
              }
            },
            onCommit: () => {
              inputRef.current?.blur();
            }
          });
        }
      }}
      onBlur={(event) => {
        setFocused(false);
        commitValue(draft);
        onBlur?.(event);
      }}
    />
  );
});

