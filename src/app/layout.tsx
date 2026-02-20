import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "meta.layout" });

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.webmanifest",
    applicationName: t("applicationName"),
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      apple: "/apple-touch-icon.png",
    },
    alternates: {
      languages: {
        en: "/en",
        bs: "/bs",
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("applicationName"),
    },
    openGraph: {
      title: t("title"),
      description: t("openGraphDescription"),
      type: "website",
      locale,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        {/* Synchronous theme script — runs before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("ferroscale-theme");if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased min-h-dvh`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
