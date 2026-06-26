import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorialDetailView, TutorialNotFoundState } from "@/components/tutorials/tutorial-detail-view";
import { TutorialsErrorState } from "@/components/tutorials/tutorials-grid-view";
import { fetchTutorialItem } from "@/lib/airtable/queries";

type TutorialDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: TutorialDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const tutorial = await fetchTutorialItem(id);
    if (!tutorial) return { title: "Tutorial not found" };

    return {
      title: tutorial.name,
      description: tutorial.briefDescription || "Shooting Challenge tutorial.",
    };
  } catch {
    return { title: "Tutorial" };
  }
}

export default async function TutorialDetailPage({ params }: TutorialDetailPageProps) {
  const { id } = await params;

  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) {
    notFound();
  }

  try {
    const tutorial = await fetchTutorialItem(id);
    if (!tutorial) return <TutorialNotFoundState />;
    return <TutorialDetailView tutorial={tutorial} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <TutorialsErrorState message={message} />;
  }
}
