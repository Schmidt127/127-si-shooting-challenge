import type { MetadataRoute } from "next";

import { APP_BASE_PATH, SITE_URL } from "@/lib/app-config";

/** Public crawl policy for the Fairfield-hosted Shooting Challenge application. */
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
