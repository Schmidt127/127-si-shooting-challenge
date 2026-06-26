import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  TutorialMediaDetailView,
  TutorialMediaErrorState,
  TutorialMediaNotFoundState,
} from "@/components/tutorial-media/tutorial-media-views";
import { fetchArticleItem } from "@/lib/airtable/queries";
import { ARTICLES_SECTION } from "@/lib/tutorial-media/config";

type ArticleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: ArticleDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const item = await fetchArticleItem(id);
    if (!item) return { title: "Article not found" };

    return {
      title: item.name,
      description: item.briefDescription || "Shooting Challenge article book reading.",
    };
  } catch {
    return { title: "Article" };
  }
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { id } = await params;

  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) {
    notFound();
  }

  try {
    const item = await fetchArticleItem(id);
    if (!item) return <TutorialMediaNotFoundState config={ARTICLES_SECTION} />;
    return <TutorialMediaDetailView item={item} config={ARTICLES_SECTION} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <TutorialMediaErrorState config={ARTICLES_SECTION} message={message} />;
  }
}
