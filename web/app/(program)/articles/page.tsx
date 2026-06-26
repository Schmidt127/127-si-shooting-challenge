import type { Metadata } from "next";

import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { fetchArticleCatalog } from "@/lib/airtable/queries";
import { ARTICLES_SECTION } from "@/lib/tutorial-media/config";

export const metadata: Metadata = {
  title: "Articles",
  description: "FBC article book readings and reflections for the Shooting Challenge.",
};

export const revalidate = 300;

export default async function ArticlesPage() {
  try {
    const data = await fetchArticleCatalog();

    if (data.totalTutorials === 0) {
      return <TutorialMediaEmptyState config={ARTICLES_SECTION} />;
    }

    return <TutorialMediaGridView data={data} config={ARTICLES_SECTION} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <TutorialMediaErrorState config={ARTICLES_SECTION} message={message} />;
  }
}
