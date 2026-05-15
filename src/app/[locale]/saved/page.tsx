import { redirect } from "@/i18n/navigation";

interface SavedPageProps {
  params: Promise<{ locale: string }>;
}

// Templates / Saved is hidden in the v3 redesign. The route is kept
// alive (so old deep links don't 404) but immediately redirects to
// the calculator. The underlying useSaved hook keeps running so
// localStorage data is preserved for when the tab returns.
export default async function SavedPage({ params }: SavedPageProps) {
  const { locale } = await params;
  redirect({ href: "/", locale });
}
