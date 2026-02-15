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
      className="rounded-md border border-red-border bg-red-surface p-3 text-red-900"
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm font-semibold">{t("issues.title")}</p>
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
