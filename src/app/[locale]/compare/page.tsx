import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface ComparePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: ComparePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.compare" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ComparePage() {
  return null;
}
