import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production
  // Ensure environment variables are available at runtime
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
