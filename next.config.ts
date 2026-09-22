import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone output is intended for self-hosted containerized environments (Docker).
  // On Vercel, Vercel manages serverless output tracing natively; setting standalone
  // on Vercel triggers an ENOENT build error looking for next-server.js.nft.json.
  output: process.env.VERCEL ? undefined : "standalone",
  // The workspace rail puts the theme toggle and Settings in the bottom-left
  // corner, which is exactly where Next's dev-tools badge floats — it sits on
  // top of them and swallows the click. The badge is a development-only
  // affordance and affects nothing in a production build.
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The app has no reason to be framed; the Drive-sync OAuth callback
          // in particular should never render inside someone else's page.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
