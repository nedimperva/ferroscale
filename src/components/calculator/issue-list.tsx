import { memo } from "react";
import { useTranslations } from "next-intl";
import type { ValidationIssue } from "@/lib/calculator/types";

interface IssueListProps {
  issues: ValidationIssue[];
}

export const IssueList = memo(function IssueList({ issues }: IssueListProps) {
  const t = useTranslations();

  const resolveValues = (values?: Record<string, string | number>) => {
    if (!values) return values;
    const labelKey = values.labelKey;
    if (typeof labelKey === "string") {
      return {
        ...values,
        label: t(labelKey),
      };
    }
    return values;
  };

  if (issues.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-red-border bg-red-surface p-3 text-red-text"
      role="alert"
      aria-live="polite"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
        {t("issues.title")}
      </p>
      <ul className="mt-1 list-disc pl-5 text-xs">
        {issues.map((issue) => (
          <li key={`${issue.field}-${issue.message}`}>
            {issue.messageKey
              ? t(issue.messageKey, resolveValues(issue.messageValues))
              : issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
});
