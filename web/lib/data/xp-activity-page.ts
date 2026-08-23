import { cache } from "react";

import { loadXpActivityPageForSlug } from "@/lib/data/xp-activity-loader";
import type { XpActivityLoadResult } from "@/types/xp-activity";

export const loadXpActivityPageResult = cache(
  async (slug: string, cursor: string | null): Promise<XpActivityLoadResult> =>
    loadXpActivityPageForSlug(slug, cursor),
);
