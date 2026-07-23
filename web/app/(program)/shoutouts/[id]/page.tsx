import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  TutorialMediaDetailView,
  TutorialMediaErrorState,
  TutorialMediaNotFoundState,
} from "@/components/tutorial-media/tutorial-media-views";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchShoutoutItem } from "@/lib/airtable/queries";
import { SHOUTOUTS_SECTION } from "@/lib/tutorial-media/config";

type ShoutoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: ShoutoutDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const item = await fetchShoutoutItem(id);
    if (!item) return { title: "Shoutout not found" };

    return {
      title: item.name,
      description: item.briefDescription || "Shooting Challenge athlete shoutout.",
    };
  } catch {
    return { title: "Shoutout" };
  }
}

export default async function ShoutoutDetailPage({ params }: ShoutoutDetailPageProps) {
  const { id } = await params;

  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) {
    notFound();
  }

  try {
    const item = await fetchShoutoutItem(id);
    if (!item) return <TutorialMediaNotFoundState config={SHOUTOUTS_SECTION} />;
    return <TutorialMediaDetailView item={item} config={SHOUTOUTS_SECTION} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <TutorialMediaErrorState config={SHOUTOUTS_SECTION} message={message} />;
  }
}
