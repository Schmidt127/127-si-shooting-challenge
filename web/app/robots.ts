import type { MetadataRoute } from "next";

import { APP_BASE_PATH, SITE_URL } from "@/lib/app-config";
import { robotsDisallowPaths } from "@/lib/seo/metadata";

/** Public crawl policy for the Fairfield-hosted Shooting Challenge application. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: `${APP_BASE_PATH}/`,
      disallow: robotsDisallowPaths(APP_BASE_PATH),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
