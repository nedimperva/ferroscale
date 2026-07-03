"use client";

import { useTranslations } from "next-intl";

export function DeskBtn({
  children,
  onClick,
  primary,
  small,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-1 items-center justify-center gap-[7px] rounded-[11px] font-bold whitespace-nowrap"
      style={{
        padding: small ? "7px 13px" : "10px 16px",
        cursor: disabled ? "default" : "pointer",
        border: primary ? "none" : "1px solid var(--border-faint)",
        background: primary ? "var(--accent)" : "var(--surface)",
        color: primary ? ("var(--accent-contrast)") : "var(--foreground)",
        fontSize: small ? 12 : 13,
        opacity: disabled ? 0.45 : 1,
        boxShadow: primary ? "none" : "var(--panel-shadow-soft)",
      }}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono text-[10px] font-bold rounded-md whitespace-nowrap"
      style={{
        padding: "2.5px 6px",
        background: "var(--surface)",
        border: "1px solid var(--border-faint)",
        color: "var(--muted)",
      }}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold text-muted" style={{ letterSpacing: 1.2 }}>
      {children}
    </span>
  );
}

/* ───────────────────────── Calculator view ───────────────────────── */

export function DeskTokenChip({
  tok,
  kindClass,
  onEdit,
  onRemove,
}: {
  tok: string;
  kindClass: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("command");
  return (
    <span className={`inline-flex items-stretch font-mono text-base font-semibold rounded-lg ${kindClass}`}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("token.edit", { token: tok })}
        className="pl-2.5 pr-1 py-1 rounded-l-lg"
      >
        {tok}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("token.remove", { token: tok })}
        className="flex items-center justify-center w-6 rounded-r-lg text-[14px] leading-none hover:bg-[rgba(0,0,0,0.08)] dark:hover:bg-[rgba(255,255,255,0.12)]"
      >
        ×
      </button>
    </span>
  );
}

export function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function DeskIcon({ name, stroke }: { name: string; stroke?: string }) {
  const c = stroke ?? "currentColor";
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: c,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "calc":
      return (
        <svg {...common}>
          <path d="M4 17l6-5-6-5" />
          <path d="M13 19h7" />
        </svg>
      );
    case "saved":
      return (
        <svg {...common}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="18" rx="1.5" />
          <rect x="14" y="3" width="7" height="18" rx="1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common} width={15} height={15} strokeLinejoin={undefined}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common} width={15} height={15}>
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common} width={15} height={15}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} width={15} height={15} strokeWidth={2.2} strokeLinejoin={undefined}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "link":
      return (
        <svg {...common} width={15} height={15}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common} width={14} height={14}>
          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        </svg>
      );
    default:
      return null;
  }
}
