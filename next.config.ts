import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-ignore - nodeMiddleware is supported by Vercel but not in Next.js types yet
    nodeMiddleware: true,
  },
};

export default nextConfig;
