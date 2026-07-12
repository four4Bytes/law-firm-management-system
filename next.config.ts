import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  generateBuildId: async () => {
    return process.env.NEXT_PUBLIC_APP_VERSION ?? "local-dev";
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0-dev",
  },
};

export default nextConfig;
