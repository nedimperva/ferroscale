import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { DATASET_VERSION } from "@/lib/datasets/version";

/**
 * `new Date()` was evaluated per request, so every crawl saw all four URLs
 * "modified just now" — which makes the field worthless as a signal. The
 * dataset version is the closest thing to a real content date this app has.
 */
function lastModified(): Date {
  const [year, month] = DATASET_VERSION.split(".");
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ferroscale.nedimp.com";
  const localizedRoutes = ["", "/contact"];

  return routing.locales.flatMap((locale) =>
    localizedRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      changeFrequency: "weekly",
      priority: route === "" ? 1 : 0.7,
      lastModified: lastModified(),
    })),
  );
}
