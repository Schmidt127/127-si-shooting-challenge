import type { NextConfig } from "next";

/**
 * Next.js configuration for the Hoop Challenges web app.
 * Redirects: see web/docs/site-hierarchy.md § Legacy redirects.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Scaffold-era URL → canonical Shooting Challenge leaderboard
      {
        source: "/leaderboard",
        destination: "/shooting-challenge/leaderboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
