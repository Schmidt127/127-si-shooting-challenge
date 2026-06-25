import type { Metadata } from "next";

import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { fetchShoutoutCatalog } from "@/lib/airtable/queries";
import { SHOUTOUTS_SECTION } from "@/lib/tutorial-media/config";

export const metadata: Metadata = {
  title: "Shout-outs",
  description: "Athlete shout-outs and highlights from the Shooting Challenge.",
};

export const revalidate = 300;

export default async function ShoutoutsPage() {
  try {
    const data = await fetchShoutoutCatalog();

    if (data.totalTutorials === 0) {
      return <TutorialMediaEmptyState config={SHOUTOUTS_SECTION} />;
    }

    return <TutorialMediaGridView data={data} config={SHOUTOUTS_SECTION} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <TutorialMediaErrorState config={SHOUTOUTS_SECTION} message={message} />;
  }
}
