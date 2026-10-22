"use client";

import { useTranslations } from "next-intl";
import type { CommandParseIssue } from "@ferroscale/metal-core";

/**
 * The explanation for a parse issue, in the user's words.
 *
 * The parser's own message says what went wrong; this says what the app was
 * trying to read, which is the part a person actually needs. The near-miss
 * comes with the issue, and it is offered as a one-tap fix rather than
 * applied on its own — a correction the app makes by itself is a correction
 * the user cannot check.
 */
export function useIssueExplanation(issue: CommandParseIssue | null) {
  const t = useTranslations("command");
  if (!issue) return null;
  const code = issue.code;
  return {
    code,
    /** What the app was trying to read. */
    title: t(`issues.explain.${code}`),
    /** The word the problem is about. */
    token: issue.token,
    /** The near-miss, when there is one. */
    fix: issue.suggestion ?? null,
    /** The parser's own wording, kept as the last line. */
    detail: t(`issues.${code}`, issue.params as Record<string, string | number>),
  };
}

export interface IssueExplainerProps {
  issue: CommandParseIssue;
  /** The token text to swap in — the near-miss. */
  onFix: (value: string) => void;
  onClose: () => void;
}

/**
 * The panel that opens under the command line when a marked chip is tapped.
 * It sits under the bar rather than floating over it: an anchored popover
 * would be clipped by the phone's scrolling chip row, and a panel can hold
 * the sentence and the fix without fighting the layout.
 */
export function IssueExplainer({ issue, onFix, onClose }: IssueExplainerProps) {
  const t = useTranslations("command");
  const explanation = useIssueExplanation(issue);
  if (!explanation) return null;

  return (
    <div
      className="fs-rise border-t border-[var(--border-faint)] bg-[var(--surface)] px-[18px] py-3"
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-[3px] h-[7px] w-[7px] shrink-0"
          style={{ background: "var(--amber-text)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[13px] leading-[1.45] text-foreground">
            {explanation.title}
          </p>
          <p className="mt-1 font-mono text-[11.5px] leading-[1.45] text-muted">
            <span className="text-[var(--foreground-secondary)]">{explanation.token}</span>
            {" — "}
            {explanation.detail}
          </p>
          {explanation.fix ? (
            <button
              type="button"
              onClick={() => onFix(explanation.fix as string)}
              className="fs-pop mt-2 inline-flex items-center gap-1.5 border border-[var(--accent-border)] bg-[var(--accent-surface)] px-2.5 py-1.5 font-mono text-[12px] font-semibold text-[var(--accent-text)]"
            >
              {t("issues.useInstead", { value: explanation.fix })}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="premium-icon-button -mr-1 -mt-1 flex h-8 w-8 items-center justify-center text-[15px]"
        >
          ×
        </button>
      </div>
    </div>
  );
}
