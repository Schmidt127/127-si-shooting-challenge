import type { Metadata } from "next";

import { LevelsEmptyState, LevelsErrorState, LevelsLadderView } from "@/components/levels/levels-ladder-view";
import { CatalogStructuredData } from "@/components/seo/catalog-structured-data";
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
  const structuredData = <CatalogStructuredData section="levels" />;

  try {
    const data = await fetchLevelLadder();

    if (data.totalLevels === 0) {
      return (
        <>
          {structuredData}
          <LevelsEmptyState />
        </>
      );
    }

    return (
      <>
        {structuredData}
        <LevelsLadderView data={data} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return (
      <>
        {structuredData}
        <LevelsErrorState message={message} />
      </>
    );
  }
}
