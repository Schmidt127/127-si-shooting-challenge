import type { Metadata } from "next";

import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchArticleCatalog } from "@/lib/airtable/queries";
import { ARTICLES_SECTION } from "@/lib/tutorial-media/config";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Articles",
  description: "FBC article book readings and reflections for the Shooting Challenge.",
  path: "/articles",
});

export const revalidate = 300;

export default async function ArticlesPage() {
  try {
    const data = await fetchArticleCatalog();

    if (data.totalTutorials === 0) {
      return <TutorialMediaEmptyState config={ARTICLES_SECTION} />;
    }

    return <TutorialMediaGridView data={data} config={ARTICLES_SECTION} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <TutorialMediaErrorState config={ARTICLES_SECTION} message={message} />;
  }
}
