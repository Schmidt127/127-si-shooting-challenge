import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  HomeworkDetailView,
  HomeworkNotFoundState,
} from "@/components/homework/homework-detail-view";
import { HomeworkErrorState } from "@/components/homework/homework-catalog-view";
import { DetailStructuredData } from "@/components/seo/detail-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchScheduledHomeworkAssignment } from "@/lib/airtable/homework-queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

type HomeworkDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: HomeworkDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const assignment = await fetchScheduledHomeworkAssignment(id);
    if (!assignment) {
      return { title: "Homework not found" };
    }

    return buildPageMetadata({
      title: assignment.displayName,
      description: assignment.briefDescription || `${assignment.weekName} homework assignment.`,
      path: `/homework/${id}`,
    });
  } catch {
    return { title: "Homework" };
  }
}

export default async function HomeworkDetailPage({ params }: HomeworkDetailPageProps) {
  const { id } = await params;

  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) {
    notFound();
  }

  try {
    const assignment = await fetchScheduledHomeworkAssignment(id);

    if (!assignment) {
      return <HomeworkNotFoundState />;
    }

    return (
      <>
        <DetailStructuredData
          section="homework"
          itemName={assignment.displayName}
          itemDescription={
            assignment.briefDescription || `${assignment.weekName} homework assignment.`
          }
          itemPath={`/homework/${id}`}
        />
        <HomeworkDetailView assignment={assignment} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return <HomeworkErrorState message={message} />;
  }
}
