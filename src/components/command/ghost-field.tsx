"use client";

import { forwardRef } from "react";

type GhostFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className"
> & {
  /** Faint completion text drawn after the caret (empty = nothing to show). */
  ghost: string;
  /** Layout classes for the wrapper (e.g. `flex-1 min-w-[120px]`). */
  wrapperClassName?: string;
  /** Classes for the real input (font, color, placeholder, …). */
  inputClassName: string;
  /** Font-only classes for the mirror — must match the input's text metrics so
   *  the ghost lands exactly at the caret. */
  mirrorClassName: string;
};

/**
 * A text input with IDE-style inline "ghost" completion after the caret. An
 * aria-hidden overlay renders a hidden copy of the typed value (reproducing its
 * exact width in the same font) followed by the visible ghost, so the ghost
 * sits precisely where the caret is. Purely presentational — the caller decides
 * how the ghost is accepted (typically Tab / →), and computes the ghost text.
 */
export const GhostField = forwardRef<HTMLInputElement, GhostFieldProps>(
  function GhostField(
    { ghost, wrapperClassName, inputClassName, mirrorClassName, value, style, ...rest },
    ref,
  ) {
    return (
      <span className={`relative inline-flex items-center min-w-0 ${wrapperClassName ?? ""}`}>
        <input
          ref={ref}
          value={value}
          className={`w-full min-w-0 ${inputClassName}`}
          // Zero the UA input padding so the mirror at left:0 aligns with the text.
          style={{ padding: 0, ...style }}
          {...rest}
        />
        {ghost ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre ${mirrorClassName}`}
          >
            <span className="invisible">{String(value ?? "")}</span>
            <span style={{ color: "var(--muted-faint)" }}>{ghost}</span>
          </span>
        ) : null}
      </span>
    );
  },
);
