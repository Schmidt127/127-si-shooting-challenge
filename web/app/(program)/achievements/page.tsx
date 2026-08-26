import type { Metadata } from "next";

import {
  AchievementsEmptyState,
  AchievementsErrorState,
  AchievementsGridView,
} from "@/components/achievements/achievements-grid-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchAchievementCatalog } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Achievements — Milestones and Streaks",
  description:
    "Shooting Challenge achievements, streaks, and milestone badges earned through daily practice, homework, and season goals.",
  path: "/achievements",
});

export const revalidate = 300;

export default async function AchievementsPage() {
  try {
    const data = await fetchAchievementCatalog();

    if (data.totalAchievements === 0) {
      return <AchievementsEmptyState />;
    }

    return <AchievementsGridView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <AchievementsErrorState message={message} />;
  }
}
