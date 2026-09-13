import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { DATASET_VERSION } from "@/lib/datasets/version";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FerroScale";

/**
 * Shared result links are a headline feature — the query mirrors to `?q=`,
 * Share is a primary action on every layout, and share-card.ts exists to make
 * one. But og:image was null, so every link pasted into WhatsApp, Viber or
 * Slack rendered as a bare grey rectangle.
 *
 * Drawn in the app's own language: warm paper, a hairline rule, the terracotta
 * mark, and figures in a mono face with the dataset version cited — the same
 * traceability the result panel shows.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.layout" });

  const PAPER = "#f4f3f0";
  const INK = "#191817";
  const MUTED = "#57544e";
  const ACCENT = "#c4471a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 44, height: 44, background: ACCENT, display: "flex" }} />
          <div style={{ fontSize: 44, fontWeight: 800, color: INK, letterSpacing: -1 }}>
            FerroScale
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ fontSize: 68, color: INK, lineHeight: 1.12, maxWidth: 940, fontWeight: 600 }}>
            {t("ogTagline")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontSize: 30, color: ACCENT, fontWeight: 700 }}>hea120 6m x2 s235</div>
            <div style={{ fontSize: 30, color: MUTED }}>→</div>
            <div style={{ fontSize: 30, color: INK, fontWeight: 700 }}>238.7 kg</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${INK}`,
            paddingTop: 22,
            fontSize: 24,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>EN profiles · steel · stainless · aluminium</div>
          <div style={{ display: "flex" }}>Dataset {DATASET_VERSION}</div>
        </div>
      </div>
    ),
    size,
  );
}
