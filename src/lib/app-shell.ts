"use client";

import { routing, type AppLocale } from "@/i18n/routing";

export type AppTabId = "calculator" | "saved" | "projects" | "settings";

export interface AppTabDefinition {
  id: AppTabId;
  href: string;
  segment: "" | "saved" | "projects" | "settings";
}

// `saved` is intentionally excluded from APP_TABS while Templates is
// hidden in the redesign. The AppTabId union keeps the value so that
// existing code (useSaved, TemplatesPanel, deep links) compiles; bringing
// the tab back is just re-adding the entry here + the menu/sidebar rows.
export const APP_TABS: readonly AppTabDefinition[] = [
  { id: "calculator", href: "/", segment: "" },
  { id: "projects", href: "/projects", segment: "projects" },
  { id: "settings", href: "/settings", segment: "settings" },
] as const;

export function stripLocaleFromPathname(pathname: string): string {
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
    case "/settings":
      return "settings";
    default:
      return null;
  }
}

export function getAppTabHref(tab: AppTabId): string {
  return APP_TABS.find((candidate) => candidate.id === tab)?.href ?? "/";
}

export function getAppTabIndex(tab: AppTabId): number {
  return APP_TABS.findIndex((candidate) => candidate.id === tab);
}

export function getAdjacentAppTab(tab: AppTabId, offset: -1 | 1): AppTabId | null {
  const next = APP_TABS[getAppTabIndex(tab) + offset];
  return next?.id ?? null;
}
