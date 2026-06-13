import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: { fullUrl: true },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
