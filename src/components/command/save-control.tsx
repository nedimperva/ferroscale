"use client";

import { useTranslations } from "next-intl";

/**
 * The one place a calculation goes somewhere.
 *
 * There used to be three controls in a row that all looked like saving and
 * all meant different things — a bookmark toggle, an "Add to project" button
 * and a "Save to…" item hidden in an overflow menu — plus a fourth on the
 * phone with a different arrangement. Deciding between them was the work, and
 * it had to be done at the moment you are least ready to: right after getting
 * the number.
 *
 * So there is one split control. Its primary says what will happen, in words,
 * and it says the likely thing: the job you are working out of if there is
 * one, and otherwise keeping the cut. The caret opens the full picker for
 * everything else. Identical on the phone and the workspace, because it is
 * the same decision on both.
 */
export function SaveControl({
  projectName,
  saved,
  disabled,
  onPrimary,
  onOpenPicker,
  compact,
}: {
  /** The project being worked out of, if any — the primary files into it. */
  projectName: string | null;
  /** With no project in play, the primary is a bookmark and this is its state. */
  saved: boolean;
  disabled?: boolean;
  onPrimary: () => void;
  onOpenPicker: () => void;
  /** Phone sizing: 44px targets, label allowed to shrink. */
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const filing = projectName != null;
  const label = filing
    ? t("save.toProject", { project: projectName })
    : saved
      ? t("common.saved")
      : t("save.toLibrary");

  const height = compact ? 44 : 34;

  return (
    <div className="flex items-stretch min-w-0" style={{ height }}>
      <button
        type="button"
        onClick={onPrimary}
        disabled={disabled}
        title={label}
        aria-pressed={filing ? undefined : saved}
        className={`inline-flex items-center gap-[7px] min-w-0 font-bold whitespace-nowrap cursor-pointer disabled:cursor-default ${
          compact ? "flex-1 justify-center text-[13px] px-3" : "text-[13px] px-4"
        }`}
        style={{
          border: "none",
          // Filing into a job is the committing action, so it carries the ink.
          // A bookmark is quieter, and quieter still once it is set.
          background: disabled
            ? "var(--border)"
            : filing
              ? "var(--action)"
              : saved
                ? "var(--surface-raised)"
                : "var(--action)",
          color: disabled
            ? "var(--muted)"
            : saved && !filing
              ? "var(--foreground)"
              : "var(--action-contrast)",
        }}
      >
        <svg
          className="flex-shrink-0"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={saved && !filing ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {filing ? (
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          ) : (
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          )}
        </svg>
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={onOpenPicker}
        disabled={disabled}
        aria-label={t("save.elsewhere")}
        title={t("save.elsewhere")}
        aria-haspopup="dialog"
        className="inline-flex items-center justify-center flex-shrink-0 cursor-pointer disabled:cursor-default"
        style={{
          width: compact ? 44 : 30,
          borderLeft: "1px solid var(--border-faint)",
          border: "1px solid var(--border)",
          borderLeftWidth: 0,
          background: disabled ? "var(--border)" : "var(--surface)",
          color: disabled ? "var(--muted)" : "var(--foreground)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
