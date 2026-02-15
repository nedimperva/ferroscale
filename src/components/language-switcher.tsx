"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
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

  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground-secondary ${className}`}
    >
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
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as AppLocale;
          document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
          router.replace(getPathWithoutLocale(pathname), { locale: nextLocale });
        }}
        className="bg-transparent text-xs outline-none"
        aria-label={t("label")}
      >
        {routing.locales.map((item) => (
          <option key={item} value={item}>
            {t(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
