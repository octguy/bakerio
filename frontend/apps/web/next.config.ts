import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@repo/api-client"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.bakerio.vn" },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    // The branding site is a static export (output: "export") served over FTP/cPanel.
    // There is no Node server to host the /api/backend proxy, so the browser must
    // call the backend directly. Point the api-client's proxy path at the absolute
    // backend URL (build-time inlined). Requires the backend to allow CORS from this
    // origin. Order/console keep the default "/api/backend" (their servers proxy).
    NEXT_PUBLIC_API_PROXY_PATH:
      process.env.NEXT_PUBLIC_API_PROXY_PATH ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "",
    NEXT_PUBLIC_BRANDING_URL: process.env.BRANDING_URL || process.env.NEXT_PUBLIC_BRANDING_URL || "",
    NEXT_PUBLIC_ORDER_URL: process.env.ORDER_URL || process.env.NEXT_PUBLIC_ORDER_URL || "",
    NEXT_PUBLIC_CONSOLE_URL: process.env.CONSOLE_URL || process.env.NEXT_PUBLIC_CONSOLE_URL || "",
  },
};

export default nextConfig;
