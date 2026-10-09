import { pageCard } from "@/lib/og/card";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FerroScale";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageCard(locale, "settings", "/settings");
}
