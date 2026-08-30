import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorialDetailView, TutorialNotFoundState } from "@/components/tutorials/tutorial-detail-view";
import { TutorialsErrorState } from "@/components/tutorials/tutorials-grid-view";
import { DetailStructuredData } from "@/components/seo/detail-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchTutorialItem } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

type TutorialDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: TutorialDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const tutorial = await fetchTutorialItem(id);
    if (!tutorial) return { title: "Tutorial not found" };

    return buildPageMetadata({
      title: tutorial.name,
      description: tutorial.briefDescription || "Shooting Challenge tutorial.",
      path: `/tutorials/${id}`,
    });
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
    return (
      <>
        <DetailStructuredData
          section="tutorials"
          itemName={tutorial.name}
          itemDescription={tutorial.briefDescription || "Shooting Challenge tutorial."}
          itemPath={`/tutorials/${id}`}
        />
        <TutorialDetailView tutorial={tutorial} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return <TutorialsErrorState message={message} />;
  }
}
