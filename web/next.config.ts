import type { NextConfig } from "next";

/**
 * Mounted at https://www.hoopchallenges.com/shoot via landing Vercel rewrite.
 * Local: http://localhost:3001/shoot
 *
 * Many catalog images currently pass `unoptimized` on next/image; remotePatterns
 * keep the door open for optimized Airtable attachment hosts without inventing hosts.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/shoot";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "v5.airtableusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.airtableusercontent.com",
      },
      {
        protocol: "https",
        hostname: "dl.airtable.com",
      },
      {
        protocol: "https",
        hostname: "make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
