import type { Metadata } from "next";

import {
  TutorialsEmptyState,
  TutorialsErrorState,
  TutorialsGridView,
} from "@/components/tutorials/tutorials-grid-view";
import { CatalogStructuredData } from "@/components/seo/catalog-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchTutorialCatalog } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Shooting Tutorials — Skills and Technique",
  description:
    "Youth basketball shooting tutorials and technique videos for the Shooting Challenge — form breakdowns, film study, and skill development families can review between practices.",
  path: "/tutorials",
});

export const revalidate = 300;

export default async function TutorialsPage() {
  const structuredData = <CatalogStructuredData section="tutorials" />;

  try {
    const data = await fetchTutorialCatalog();

    if (data.totalTutorials === 0) {
      return (
        <>
          {structuredData}
          <TutorialsEmptyState />
        </>
      );
    }

    return (
      <>
        {structuredData}
        <TutorialsGridView data={data} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return (
      <>
        {structuredData}
        <TutorialsErrorState message={message} />
      </>
    );
  }
}
