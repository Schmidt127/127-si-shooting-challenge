import type { Metadata } from "next";

import {
  PublicDisplayEmptyState,
  PublicDisplayErrorState,
  PublicDisplayView,
} from "@/components/public-display/public-display-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchLeaderboard } from "@/lib/airtable/queries";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Public Display",
  description: "Full-screen season leaderboard for gyms and event displays.",
  path: "/public-display",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

/** Airtable's 120-second data cache is the sole standings cache layer. */
export const revalidate = 0;

export default async function PublicDisplayPage() {
  try {
    const data = await fetchLeaderboard();

    if (data.entries.length === 0) {
      return <PublicDisplayEmptyState />;
    }

    return <PublicDisplayView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <PublicDisplayErrorState message={message} />;
  }
}
