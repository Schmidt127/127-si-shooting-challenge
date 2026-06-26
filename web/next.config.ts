import type { NextConfig } from "next";

/**
 * Mounted at https://www.hoopchallenges.com/shoot via landing Vercel rewrite.
 * Local: http://localhost:3001/shoot
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/shoot";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
};

export default nextConfig;
