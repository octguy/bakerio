import type { NextConfig } from "next";

const adminUrl = process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL || "";

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
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_BRANDING_URL: process.env.BRANDING_URL || process.env.NEXT_PUBLIC_BRANDING_URL || "",
    NEXT_PUBLIC_ORDER_URL: process.env.ORDER_URL || process.env.NEXT_PUBLIC_ORDER_URL || "",
    NEXT_PUBLIC_ADMIN_URL: adminUrl,
    NEXT_PUBLIC_API_PROXY_URL: adminUrl ? `${adminUrl.replace(/\/+$/, "")}/api/backend` : "",
  },
};

export default nextConfig;
