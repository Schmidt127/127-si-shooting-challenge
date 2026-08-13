import type { Metadata } from "next";

import {
  LeaderboardEmptyState,
  LeaderboardErrorState,
  LeaderboardView,
} from "@/components/leaderboard/leaderboard-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchLeaderboard } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Live season rankings for the 127 Sports Intensity Shooting Challenge — XP, levels, and total shots.",
};

/** Airtable's 120-second data cache is the sole standings cache layer. */
export const revalidate = 0;

export default async function LeaderboardPage() {
  try {
    const data = await fetchLeaderboard();

    if (data.entries.length === 0) {
      return <LeaderboardEmptyState />;
    }

    return <LeaderboardView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <LeaderboardErrorState message={message} />;
  }
}
