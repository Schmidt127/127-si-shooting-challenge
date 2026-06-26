import type { NextConfig } from "next";

/**
 * Next.js configuration for the Hoop Challenges web app.
 * Redirects: see web/docs/site-hierarchy.md § Legacy redirects.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/leaderboard",
        destination: "/shooting-challenge/leaderboard",
        permanent: true,
      },
      {
        source: "/referee-clinics",
        destination: "/jr-referee-clinics",
        permanent: true,
      },
      {
        source: "/referee-clinics/:path*",
        destination: "/jr-referee-clinics/:path*",
        permanent: true,
      },
      {
        source: "/kids-ref-now",
        destination: "/jr-referee-clinics",
        permanent: true,
      },
      {
        source: "/kids-ref-now/:path*",
        destination: "/jr-referee-clinics/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
