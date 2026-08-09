import type { MetadataRoute } from "next";

import { APP_BASE_PATH, SITE_URL } from "@/lib/app-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: `${APP_BASE_PATH}/`,
      disallow: [`${APP_BASE_PATH}/admin`, `${APP_BASE_PATH}/api/`],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
