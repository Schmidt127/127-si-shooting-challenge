import type { Metadata } from "next";

import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { CatalogStructuredData } from "@/components/seo/catalog-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchShoutoutCatalog } from "@/lib/airtable/queries";
import { SHOUTOUTS_SECTION } from "@/lib/tutorial-media/config";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Athlete Shoutouts — Highlights and Recognition",
  description:
    "Athlete shoutouts and highlights from the youth basketball Shooting Challenge — celebrate progress and standout performances.",
  path: "/shoutouts",
});

export const revalidate = 300;

export default async function ShoutoutsPage() {
  const structuredData = <CatalogStructuredData section="shoutouts" />;

  try {
    const data = await fetchShoutoutCatalog();

    if (data.totalTutorials === 0) {
      return (
        <>
          {structuredData}
          <TutorialMediaEmptyState config={SHOUTOUTS_SECTION} />
        </>
      );
    }

    return (
      <>
        {structuredData}
        <TutorialMediaGridView data={data} config={SHOUTOUTS_SECTION} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return (
      <>
        {structuredData}
        <TutorialMediaErrorState config={SHOUTOUTS_SECTION} message={message} />
      </>
    );
  }
}
