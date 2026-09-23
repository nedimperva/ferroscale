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
    // Renders nothing on the server (the client shell mounts here) and mirrors
    // the user's own local data — nothing for a crawler to index.
    robots: { index: false, follow: true },
  };
}

export default function SettingsPage() {
  return null;
}
