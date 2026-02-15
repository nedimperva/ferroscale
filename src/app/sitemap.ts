import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://advanced-metal-calc.example";
  const localizedRoutes = ["", "/contact"];

  return routing.locales.flatMap((locale) =>
    localizedRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      changeFrequency: "weekly",
      priority: route === "" ? 1 : 0.7,
      lastModified: new Date(),
    })),
  );
}
