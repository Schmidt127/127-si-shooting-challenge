import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/app-config";

const PUBLIC_ROUTES = [
  "",
  "/leaderboard",
  "/homework",
  "/levels",
  "/achievements",
  "/tutorials",
  "/zoom-meetings",
  "/game-manual",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: index === 0 || path === "/leaderboard" ? "daily" : "weekly",
    priority: index === 0 ? 1 : path === "/leaderboard" ? 0.9 : 0.7,
  }));
}
