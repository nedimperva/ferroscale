import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
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

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>
      <NextIntlClientProvider locale={locale} messages={messages}>
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
