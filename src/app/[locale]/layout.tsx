import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { RouteAwareAppShell } from "@/components/route-aware-app-shell";
import { routing } from "@/i18n/routing";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "loading" });
  const accessibilityT = await getTranslations({ locale, namespace: "accessibility" });

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-blue-500"
      >
        {accessibilityT("skipToMain")}
      </a>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div aria-hidden="true" className="boot-splash lg:hidden">
          <div className="boot-splash-card">
            <div className="boot-splash-glow" />
            <div className="boot-splash-mark">
              <Image
                src="/icon-192.png"
                alt=""
                width={56}
                height={56}
                className="h-full w-full rounded-[1.15rem]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent-text">
                {t("title")}
              </p>
              <p className="text-xl font-semibold tracking-tight text-foreground">FerroScale</p>
              <p className="mx-auto max-w-[18rem] text-sm leading-6 text-muted">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2.5" aria-hidden="true">
              <span className="boot-splash-dot" />
              <span className="boot-splash-dot" />
              <span className="boot-splash-dot" />
            </div>
          </div>
        </div>
        <ErrorBoundary>
          <main id="main-content" suppressHydrationWarning>
            <RouteAwareAppShell>{children}</RouteAwareAppShell>
          </main>
        </ErrorBoundary>
      </NextIntlClientProvider>
    </>
  );
}
