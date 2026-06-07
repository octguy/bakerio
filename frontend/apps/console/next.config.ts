import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const consoleUrl = process.env.CONSOLE_URL || process.env.NEXT_PUBLIC_CONSOLE_URL || "";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/api-client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_BRANDING_URL: process.env.BRANDING_URL || process.env.NEXT_PUBLIC_BRANDING_URL || "",
    NEXT_PUBLIC_ORDER_URL: process.env.ORDER_URL || process.env.NEXT_PUBLIC_ORDER_URL || "",
    NEXT_PUBLIC_CONSOLE_URL: consoleUrl,
    NEXT_PUBLIC_API_PROXY_URL: consoleUrl ? `${consoleUrl.replace(/\/+$/, "")}/api/backend` : "",
  },
};

export default withNextIntl(nextConfig);
