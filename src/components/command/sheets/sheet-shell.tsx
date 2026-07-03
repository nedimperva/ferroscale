"use client";

import { useTranslations } from "next-intl";

interface SheetShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function SheetShell({ title, onClose, children }: SheetShellProps) {
  const t = useTranslations("command");
  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label={t("aria.closeSheet")}
        onClick={onClose}
        className="flex-1 bg-[var(--overlay)]"
      />
      <div
        className="bg-[var(--surface)] border-t border-border-faint rounded-t-3xl px-5 pt-3 pb-6 flex flex-col"
        style={{ maxHeight: "82%" }}
      >
        <div className="flex flex-col items-center mb-2">
          <span className="w-9 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>
        <div className="overflow-y-auto -mx-1 px-1">{children}</div>
      </div>
    </div>
  );
}