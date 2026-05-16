import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface ProjectDetailPageProps {
  params: Promise<{ locale: string; projectId: string }>;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.projects" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ProjectDetailPage() {
  return null;
}
