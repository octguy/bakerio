import type { NextConfig } from "next";

const orderUrl = process.env.ORDER_URL || process.env.NEXT_PUBLIC_ORDER_URL || "";

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  transpilePackages: ["@repo/api-client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.bakerio.vn" },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_BRANDING_URL: process.env.BRANDING_URL || process.env.NEXT_PUBLIC_BRANDING_URL || "",
    NEXT_PUBLIC_ORDER_URL: orderUrl,
    NEXT_PUBLIC_CONSOLE_URL: process.env.CONSOLE_URL || process.env.NEXT_PUBLIC_CONSOLE_URL || "",
    NEXT_PUBLIC_API_PROXY_URL: orderUrl ? `${orderUrl.replace(/\/+$/, "")}/api/backend` : "",
  },
};

export default nextConfig;
