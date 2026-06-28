import type { Metadata } from "next";

import {
  AchievementsEmptyState,
  AchievementsErrorState,
  AchievementsGridView,
} from "@/components/achievements/achievements-grid-view";
import { fetchAchievementCatalog } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Achievements | Shooting Challenge",
  description: "Milestones, streaks, and unlock badges for the 127 SI Shooting Challenge.",
};

export const revalidate = 300;

export default async function AchievementsPage() {
  try {
    const data = await fetchAchievementCatalog();

    if (data.totalAchievements === 0) {
      return <AchievementsEmptyState />;
    }

    return <AchievementsGridView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <AchievementsErrorState message={message} />;
  }
}
