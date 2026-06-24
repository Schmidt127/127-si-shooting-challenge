import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = {
  title: "Leaderboard | 127 SI Shooting Challenge",
};

/** Leaderboard — public ranking view (not yet implemented). */
export default function LeaderboardPage() {
  return (
    <PlaceholderPage
      title="Leaderboard"
      description="Season rankings, XP totals, and streak highlights will appear here."
    />
  );
}
