import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

/**
 * Per-page Open Graph cards — "Daylight ledger": the app's paper ground with a
 * sun glow at the top right, a tracked mono kicker, the page's name in the
 * serif, one line of detail, and a single ridgeline above the foot where the
 * page's address sits in terracotta. Terracotta marks one thing per card, as
 * it does in the app.
 *
 * Each route's `opengraph-image.tsx` is a few lines that call `pageCard` with
 * its key in the `og` message namespace, so the words are translated like any
 * other copy and a new page is one entry plus one file.
 */

export const OG_PAGES = [
  "home",
  "faq",
  "qa",
  "contact",
  "saved",
  "projects",
  "customers",
  "settings",
] as const;

export type OgPage = (typeof OG_PAGES)[number];

const SIZE = { width: 1200, height: 630 };

const PAPER = "#f4f3f0";
const GLOW = "#fff1c9";
const INK = "#191817";
const MUTED = "#57544e";
const ACCENT = "#a4380f";

const RIDGELINE = "0,150 170,96 310,128 480,52 660,120 840,74 1020,126 1200,86";

const siteHost = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ferroscale.nedimp.com",
).host;

// Satori reads TTF/OTF/WOFF, not WOFF2. Each family ships a latin and a
// latin-ext cut so Bosnian (č ć š đ ž) draws in the face rather than a fallback.
// Read from disk (a file: fetch is not implemented in the Node runtime);
// next.config.ts lists the folder in outputFileTracingIncludes so it ships.
const font = async (file: string) => {
  const buf = await readFile(path.join(process.cwd(), "src/lib/og/fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

async function loadFonts() {
  const [serif, serifExt, mono, monoExt, sans, sansExt] = await Promise.all([
    font("newsreader-latin-500-normal.woff"),
    font("newsreader-latin-ext-500-normal.woff"),
    font("ibm-plex-mono-latin-400-normal.woff"),
    font("ibm-plex-mono-latin-ext-400-normal.woff"),
    font("archivo-latin-400-normal.woff"),
    font("archivo-latin-ext-400-normal.woff"),
  ]);
  const face = (name: string, data: ArrayBuffer, weight: 400 | 500) => ({
    name,
    data,
    weight,
    style: "normal" as const,
  });
  return [
    face("Serif", serif, 500),
    face("Serif", serifExt, 500),
    face("Mono", mono, 400),
    face("Mono", monoExt, 400),
    face("Sans", sans, 400),
    face("Sans", sansExt, 400),
  ];
}

/** Longer titles step the type down before they wrap past two lines. */
function titleSize(title: string): number {
  const n = title.length;
  if (n <= 14) return 120;
  if (n <= 24) return 96;
  if (n <= 40) return 78;
  return 64;
}

export interface OgCardText {
  kicker: string;
  title: string;
  detail: string;
  /** Pathname after the host, e.g. "/en/faq". */
  path: string;
}

export async function renderOgCard({ kicker, title, detail, path }: OgCardText) {
  const fonts = await loadFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: PAPER,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1200,
            height: 630,
            background: `radial-gradient(circle at 78% 0%, ${GLOW} 0%, rgba(255,241,201,0) 55%)`,
          }}
        />
        <svg
          width="1200"
          height="200"
          viewBox="0 0 1200 200"
          style={{ position: "absolute", left: 0, bottom: 0 }}
        >
          <polyline
            points={RIDGELINE}
            fill="none"
            stroke={INK}
            strokeWidth="2"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 72,
            display: "flex",
            fontFamily: "Mono",
            fontSize: 22,
            letterSpacing: 2,
            color: MUTED,
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 190,
            width: 940,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Serif",
              fontSize: titleSize(title),
              lineHeight: 1.08,
              color: INK,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Sans",
              fontSize: 32,
              lineHeight: 1.4,
              color: MUTED,
            }}
          >
            {detail}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 80,
            bottom: 44,
            display: "flex",
            fontFamily: "Mono",
            fontSize: 20,
            letterSpacing: 2,
            color: ACCENT,
          }}
        >
          {siteHost}
          {path}
        </div>
      </div>
    ),
    { ...SIZE, fonts },
  );
}

/** The card for one app page, worded from `og.<page>` in the locale's messages. */
export async function pageCard(locale: string, page: OgPage, path: string) {
  const t = await getTranslations({ locale, namespace: "og" });
  return renderOgCard({
    kicker: t(`${page}.kicker`),
    title: t(`${page}.title`),
    detail: t(`${page}.detail`),
    path: `/${locale}${path}`,
  });
}
