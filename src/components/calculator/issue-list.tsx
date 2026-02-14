import { memo } from "react";
import type { ValidationIssue } from "@/lib/calculator/types";

interface IssueListProps {
  issues: ValidationIssue[];
}

export const IssueList = memo(function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) return null;

  return (
    <div
      className="rounded-md border border-red-border bg-red-surface p-3 text-red-900"
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm font-semibold">Validation issues</p>
      <ul className="mt-1 list-disc pl-5 text-xs">
        {issues.map((issue) => (
          <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
});
