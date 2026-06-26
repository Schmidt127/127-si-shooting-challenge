import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = {
  title: "Achievements | 127 SI Shooting Challenge",
};

/** Achievements — milestones, streaks, and unlocks. */
export default function AchievementsPage() {
  return (
    <PlaceholderPage
      title="Achievements"
      description="Shot milestones, perfect weeks, and streak achievements will appear here."
    />
  );
}
