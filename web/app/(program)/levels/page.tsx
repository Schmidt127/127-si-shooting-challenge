import type { Metadata } from "next";

import { LevelsEmptyState, LevelsErrorState, LevelsLadderView } from "@/components/levels/levels-ladder-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchLevelLadder } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Levels",
  description: "Shooting Challenge progression ladder — XP tiers from Beginner to G.O.A.T.",
};

export const revalidate = 300;

export default async function LevelsPage() {
  try {
    const data = await fetchLevelLadder();

    if (data.totalLevels === 0) {
      return <LevelsEmptyState />;
    }

    return <LevelsLadderView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <LevelsErrorState message={message} />;
  }
}
