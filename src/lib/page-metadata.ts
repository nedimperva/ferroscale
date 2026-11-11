import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Canonical and hreflang links for a content page (`/faq`, `/contact`, `/qa`).
 *
 * The root layout declares `/{locale}` as canonical, and Next hands a layout's
 * `alternates` down to every page that does not set its own — so these pages,
 * which are in the sitemap, were telling crawlers the home page was the real
 * one. Each indexable page states its own address here.
 */
export function pageAlternates(locale: string, path: `/${string}`): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}

/**
 * Title, description, canonical and Open Graph for a content page.
 *
 * Next merges metadata shallowly, so a page that sets no `openGraph` shares
 * as the home page (its title and `/{locale}` URL), and one that sets it
 * replaces the layout's whole object — hence the full set here.
 */
export async function contentPageMetadata(opts: {
  locale: string;
  path: `/${string}`;
  title: string;
  description: string;
}): Promise<Metadata> {
  const { locale, path, title, description } = opts;
  const t = await getTranslations({ locale, namespace: "meta.layout" });
  return {
    title,
    description,
    alternates: pageAlternates(locale, path),
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `/${locale}${path}`,
      siteName: t("applicationName"),
    },
  };
}
