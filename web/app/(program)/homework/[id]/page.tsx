import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  HomeworkDetailView,
  HomeworkNotFoundState,
} from "@/components/homework/homework-detail-view";
import { HomeworkErrorState } from "@/components/homework/homework-catalog-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchHomeworkAssignment } from "@/lib/airtable/queries";

type HomeworkDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: HomeworkDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const assignment = await fetchHomeworkAssignment(id);
    if (!assignment) {
      return { title: "Homework not found" };
    }

    return {
      title: assignment.displayName,
      description: assignment.briefDescription || `${assignment.weekName} homework assignment.`,
    };
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
    const assignment = await fetchHomeworkAssignment(id);

    if (!assignment) {
      return <HomeworkNotFoundState />;
    }

    return <HomeworkDetailView assignment={assignment} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <HomeworkErrorState message={message} />;
  }
}
