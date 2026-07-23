import type { Metadata } from "next";

import {
  PublicDisplayEmptyState,
  PublicDisplayErrorState,
  PublicDisplayView,
} from "@/components/public-display/public-display-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
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
      return <PublicDisplayEmptyState />;
    }

    return <PublicDisplayView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <PublicDisplayErrorState message={message} />;
  }
}
