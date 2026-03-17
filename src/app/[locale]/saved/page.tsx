import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface SavedPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: SavedPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.saved" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function SavedPage() {
  return null;
}
