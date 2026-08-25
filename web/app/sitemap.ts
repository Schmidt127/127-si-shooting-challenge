import type { MetadataRoute } from "next";

import { buildFullSitemap } from "@/lib/seo/sitemap-entries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildFullSitemap();
}
