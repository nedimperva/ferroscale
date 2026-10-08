"use client";

import { routing, type AppLocale } from "@/i18n/routing";

export type AppTabId = "calculator" | "saved" | "projects" | "customers" | "settings";

/** Route suffixes the single shell answers to, besides the calculator's "/". */
export const APP_TAB_SUFFIXES = ["/saved", "/projects", "/customers", "/settings"] as const;

function stripLocaleFromPathname(pathname: string): string {
  const cleanPath = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const normalized = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const parts = normalized.split("/").filter(Boolean);
  const first = parts[0] as AppLocale | undefined;

  if (first && routing.locales.includes(first)) {
    parts.shift();
  }

  return parts.length > 0 ? `/${parts.join("/")}` : "/";
}

export function getAppTabFromPathname(pathname: string): AppTabId | null {
  const path = stripLocaleFromPathname(pathname).replace(/\/+$/, "") || "/";

  switch (path) {
    case "/":
      return "calculator";
    case "/saved":
      return "saved";
    case "/projects":
      return "projects";
    case "/customers":
      return "customers";
    case "/settings":
      return "settings";
    default:
      return null;
  }
}
