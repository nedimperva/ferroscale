import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FaqView } from "@/components/faq/faq-view";

interface FaqPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: FaqPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.faq" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function FaqPage() {
  return <FaqView />;
}
