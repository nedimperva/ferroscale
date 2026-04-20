import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { RouteAwareAppShell } from "@/components/route-aware-app-shell";
import { ToastContainer } from "@/components/ui/toast-container";
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

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div aria-hidden="true" className="boot-splash lg:hidden">
          <div className="boot-splash-card">
            <div className="boot-splash-glow" />
            <div className="boot-splash-mark">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-surface" fill="none">
                <rect x="11.5" y="7.6" width="1" height="8.9" fill="currentColor" />
                <rect x="8" y="16.5" width="8" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="2" y="5" width="20" height="1.5" rx="0.5" fill="currentColor" />
                <circle cx="12" cy="5.75" r="1.8" fill="currentColor" />
                <rect x="2.8" y="6.5" width="1" height="4.5" fill="currentColor" />
                <rect x="20.2" y="6.5" width="1" height="4.5" fill="currentColor" />
                <ellipse cx="3.3" cy="11.8" rx="2.8" ry="1" fill="currentColor" />
                <ellipse cx="20.7" cy="11.8" rx="2.8" ry="1" fill="currentColor" />
                <rect x="2" y="21" width="20" height="1.5" rx="0.75" fill="#8d5f45" />
              </svg>
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
        {/* Toast notifications — rendered after children so they layer on top */}
        <ToastContainer />
      </NextIntlClientProvider>
    </>
  );
}
