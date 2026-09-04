import type { Metadata } from "next";

import {
  LeaderboardEmptyState,
  LeaderboardErrorState,
  LeaderboardView,
} from "@/components/leaderboard/leaderboard-view";
import { CatalogStructuredData } from "@/components/seo/catalog-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchLeaderboard } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Season Leaderboard — Youth Basketball Rankings",
  description:
    "Live youth basketball shooting challenge rankings with XP, levels, and total shots. Track season progress for boys and girls in the 127 SI program.",
  path: "/leaderboard",
});

/** Airtable's 120-second data cache is the sole standings cache layer. */
export const revalidate = 0;

export default async function LeaderboardPage() {
  const structuredData = <CatalogStructuredData section="leaderboard" />;

  try {
    const data = await fetchLeaderboard();

    if (data.entries.length === 0) {
      return (
        <>
          {structuredData}
          <LeaderboardEmptyState />
        </>
      );
    }

    return (
      <>
        {structuredData}
        <LeaderboardView data={data} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return (
      <>
        {structuredData}
        <LeaderboardErrorState message={message} />
      </>
    );
  }
}
