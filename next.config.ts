import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.stockx.com" },
      { protocol: "https", hostname: "stockx-assets.imgix.net" },
    ],
  },
};

export default nextConfig;