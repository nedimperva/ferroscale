"use client";

/**
 * The one empty state. Saved, Projects, Compare and the library sheets each
 * used to invent their own (a bare mono line here, an icon-and-title block
 * there) — this is the shared shape: an icon, a title, a sentence, and an
 * optional action or key hint, because absence is the best moment to teach
 * the shortcut that fills it.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  /** Tighter padding for in-sheet use where vertical room is scarce. */
  compact?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center text-center mx-auto"
      style={{ maxWidth: 360, padding: compact ? "28px 16px" : "48px 20px" }}
    >
      {icon && (
        <div
          className="flex items-center justify-center rounded-2xl mb-3.5"
          style={{
            width: compact ? 44 : 54,
            height: compact ? 44 : 54,
            background: "var(--accent-surface)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="font-extrabold text-foreground" style={{ fontSize: compact ? 15 : 17 }}>
        {title}
      </div>
      {body && (
        <div className="text-[13px] text-muted mt-1.5" style={{ lineHeight: 1.5 }}>
          {body}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
