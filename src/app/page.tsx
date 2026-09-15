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

interface RootRedirectPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RootRedirectPage({ searchParams }: RootRedirectPageProps) {
  const locale = await getPreferredLocale();
  const sp = searchParams ? await searchParams : {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    }
  }

  const queryStr = params.toString();
  redirect(`/${locale}${queryStr ? `?${queryStr}` : ""}`);
}
