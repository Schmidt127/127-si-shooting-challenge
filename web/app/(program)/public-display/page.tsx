import type { Metadata } from "next";

import {
  PublicDisplayErrorState,
  PublicDisplayView,
} from "@/components/public-display/public-display-view";
import { fetchLeaderboard } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Public Display",
  description: "Full-screen season leaderboard for gyms and event displays.",
};

export const revalidate = 120;

export default async function PublicDisplayPage() {
  try {
    const data = await fetchLeaderboard();

    if (data.entries.length === 0) {
      return (
        <PublicDisplayErrorState message="No leaderboard entries are available for display yet." />
      );
    }

    return <PublicDisplayView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <PublicDisplayErrorState message={message} />;
  }
}
