import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The workspace rail puts the theme toggle and Settings in the bottom-left
  // corner, which is exactly where Next's dev-tools badge floats — it sits on
  // top of them and swallows the click. The badge is a development-only
  // affordance and affects nothing in a production build.
  devIndicators: false,
};

export default withNextIntl(nextConfig);
