import type { Metadata } from "next";

import {
  LeaderboardEmptyState,
  LeaderboardErrorState,
  LeaderboardView,
} from "@/components/leaderboard/leaderboard-view";
import { fetchLeaderboard } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Leaderboard | 127 SI Shooting Challenge",
  description:
    "Live season rankings for the 127 Sports Intensity Shooting Challenge — XP, levels, and total shots.",
};

/** ISR: refresh leaderboard data every 2 minutes. */
export const revalidate = 120;

export default async function LeaderboardPage() {
  try {
    const data = await fetchLeaderboard();

    if (data.entries.length === 0) {
      return <LeaderboardEmptyState />;
    }

    return <LeaderboardView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <LeaderboardErrorState message={message} />;
  }
}
