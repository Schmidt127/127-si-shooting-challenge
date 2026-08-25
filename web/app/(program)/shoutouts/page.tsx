import type { Metadata } from "next";

import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchShoutoutCatalog } from "@/lib/airtable/queries";
import { SHOUTOUTS_SECTION } from "@/lib/tutorial-media/config";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Shoutouts",
  description: "Athlete shoutouts and highlights from the Shooting Challenge.",
  path: "/shoutouts",
});

export const revalidate = 300;

export default async function ShoutoutsPage() {
  try {
    const data = await fetchShoutoutCatalog();

    if (data.totalTutorials === 0) {
      return <TutorialMediaEmptyState config={SHOUTOUTS_SECTION} />;
    }

    return <TutorialMediaGridView data={data} config={SHOUTOUTS_SECTION} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <TutorialMediaErrorState config={SHOUTOUTS_SECTION} message={message} />;
  }
}
