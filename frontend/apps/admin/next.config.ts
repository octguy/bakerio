import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/api-client"],
};

export default nextConfig;
