import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** One-liner body copy, max ~60ch (review §11). */
  subtitle?: string;
  /** Primary CTA — pass a button. Use surface-inverted style for consistency. */
  action?: ReactNode;
  /** Quiet helper link below the CTA — "Or try a sample", "Learn more". */
  helper?: ReactNode;
  /**
   * `large` is the canonical empty: 96px icon block, 24px headline,
   * generous padding. `small` is the inline variant for filtered-empty
   * states inside cards. Defaults to `large`.
   */
  size?: "small" | "large";
}

/**
 * Canonical empty-state primitive (review §11). Promotes the Saved page's
 * pattern so every empty state in the app uses the same five elements:
 * icon block, headline, body, CTA, quiet helper.
 */
export function EmptyState({ icon, title, subtitle, action, helper, size = "large" }: EmptyStateProps) {
  if (size === "small") {
    return (
      <div className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-4 py-10 text-center">
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-accent-surface text-accent-text">
          {icon}
        </span>
        <p className="text-sm font-medium text-foreground-secondary">{title}</p>
        {subtitle && <p className="text-2xs text-muted">{subtitle}</p>}
        {action && <div className="mt-2">{action}</div>}
        {helper && <div className="mt-1 text-2xs text-muted-faint">{helper}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-2 flex h-24 w-24 items-center justify-center rounded-3xl border border-accent-border bg-accent-surface text-accent-text">
        {icon}
      </span>
      <h2 className="text-2xl font-bold tracking-[-0.02em] text-balance text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-[60ch] text-sm leading-snug text-pretty text-foreground-secondary">
          {subtitle}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
      {helper && <div className="mt-2 text-2xs text-muted">{helper}</div>}
    </div>
  );
}
