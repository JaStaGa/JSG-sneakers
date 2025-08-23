import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.stockx.com" },
      { protocol: "https", hostname: "stockx-assets.imgix.net" }, // placeholder host
    ],
  },
};

export default nextConfig;
