import type { Metadata } from "next";

import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { CatalogStructuredData } from "@/components/seo/catalog-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchArticleCatalog } from "@/lib/airtable/queries";
import { ARTICLES_SECTION } from "@/lib/tutorial-media/config";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FBC Articles — Basketball Education",
  description:
    "Fairfield Basketball Club article readings and basketball education content for Shooting Challenge athletes and families.",
  path: "/articles",
});

export const revalidate = 300;

export default async function ArticlesPage() {
  const structuredData = <CatalogStructuredData section="articles" />;

  try {
    const data = await fetchArticleCatalog();

    if (data.totalTutorials === 0) {
      return (
        <>
          {structuredData}
          <TutorialMediaEmptyState config={ARTICLES_SECTION} />
        </>
      );
    }

    return (
      <>
        {structuredData}
        <TutorialMediaGridView data={data} config={ARTICLES_SECTION} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return (
      <>
        {structuredData}
        <TutorialMediaErrorState config={ARTICLES_SECTION} message={message} />
      </>
    );
  }
}
