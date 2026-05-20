import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/api-client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.bakerio.vn" },
    ],
  },
};

export default nextConfig;
