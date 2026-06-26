import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = {
  title: "Public Display | 127 SI Shooting Challenge",
};

/**
 * Public display — gym / lobby screen mode (Softr replacement target).
 * Will show leaderboard slices and featured athletes without login.
 */
export default function PublicDisplayPage() {
  return (
    <PlaceholderPage
      title="Public Display"
      description="Full-screen public display for gyms and events. Replaces Softr public views."
    />
  );
}
