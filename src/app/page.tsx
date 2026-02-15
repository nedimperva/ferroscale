import { hasLocale } from "next-intl";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

async function getPreferredLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  if (cookieLocale && hasLocale(routing.locales, cookieLocale)) {
    return cookieLocale;
  }

  return routing.defaultLocale;
}

export default async function RootRedirectPage() {
  const locale = await getPreferredLocale();

  redirect(`/${locale}`);
}
