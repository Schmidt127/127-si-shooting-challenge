import type { Metadata } from "next";

import { LevelsEmptyState, LevelsErrorState, LevelsLadderView } from "@/components/levels/levels-ladder-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchLevelLadder } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "XP Levels — Basketball Progress Tracking",
  description:
    "Shooting Challenge level ladder from Beginner to G.O.A.T. See XP thresholds and youth basketball progress goals for every tier.",
  path: "/levels",
});

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
