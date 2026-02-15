import { memo, useState } from "react";
import { formatInputNumber, parseLocaleNumber } from "@/lib/calculator/number-input";

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

  return (
    <input
      {...rest}
      type="text"
      value={inputValue}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const parsed = parseLocaleNumber(next);
        if (parsed !== null) {
          onValueChange(parsed);
        }
      }}
      onFocus={(event) => {
        setDraft(formatInputNumber(value));
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);

        const trimmed = draft.trim();
        if (trimmed === "") {
          if (emptyValue !== undefined) {
            onValueChange(emptyValue);
            setDraft(formatInputNumber(emptyValue));
          } else {
            setDraft(formatInputNumber(value));
          }
          onBlur?.(event);
          return;
        }

        const parsed = parseLocaleNumber(trimmed);
        if (parsed !== null) {
          onValueChange(parsed);
          setDraft(formatInputNumber(parsed));
        } else {
          setDraft(formatInputNumber(value));
        }

        onBlur?.(event);
      }}
    />
  );
});
