"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Edit one token of an earlier `+` item where it stands. The caret (and the
 * keypad, and the suggestions) always type into the last item, so pulling a
 * token of item 1 "back under the caret" had nowhere to go — the chip just
 * moved to the end of its own item and nothing became editable.
 *
 * Enter, Tab or leaving the field commits; an empty field removes the token;
 * Escape puts it back as it was.
 */
export function InlineTokenEditor({
  tok,
  kindClass,
  onCommit,
  onCancel,
  className,
}: {
  tok: string;
  kindClass: string;
  /** The replacement text, trimmed — empty means remove the token. */
  onCommit: (next: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const t = useTranslations("command");
  const [value, setValue] = useState(tok);
  const doneRef = useRef(false);

  const finish = (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const next = value.trim().replace(/\s+/g, " ");
    if (commit && next !== tok) onCommit(next);
    else onCancel();
  };

  return (
    <input
      type="text"
      data-inline-token-editor=""
      autoFocus
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      autoCapitalize="off"
      autoComplete="off"
      spellCheck={false}
      aria-label={t("token.editing", { token: tok })}
      size={Math.max(3, value.length + 1)}
      className={`flex-shrink-0 font-mono font-semibold outline-none ${kindClass} ${className ?? ""}`}
      style={{ boxShadow: "inset 0 0 0 1.5px var(--foreground)" }}
    />
  );
}
