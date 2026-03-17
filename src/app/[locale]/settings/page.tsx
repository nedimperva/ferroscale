import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.settings" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function SettingsPage() {
  return null;
}
