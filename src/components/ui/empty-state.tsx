import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset text-border-strong">
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground-secondary">{title}</p>
      {subtitle && <p className="text-xs text-muted-faint">{subtitle}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
