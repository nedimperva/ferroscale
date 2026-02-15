"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const t = useTranslations("language");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const getPathWithoutLocale = (value: string): string => {
    const parts = value.split("/").filter(Boolean);
    const first = parts[0] as AppLocale | undefined;

    if (first && routing.locales.includes(first)) {
      parts.shift();
    }

    return parts.length > 0 ? `/${parts.join("/")}` : "/";
  };

  const switchLocale = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;
    router.replace(getPathWithoutLocale(pathname), { locale: nextLocale });
  };

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={`inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-1.5 py-1 text-foreground-secondary ${className}`}
    >
      {!compact && (
        <span className="inline-flex items-center gap-1.5 pl-1 text-[11px] font-medium text-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
          </svg>
          {t("label")}
        </span>
      )}

      <div className="inline-flex items-center rounded-md bg-surface-inset p-0.5">
        {routing.locales.map((item) => {
          const active = locale === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => switchLocale(item)}
              aria-pressed={active}
              aria-label={t(item)}
              title={t(item)}
              className={`rounded-[6px] px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:bg-surface-raised hover:text-foreground-secondary"
              }`}
            >
              {item.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
