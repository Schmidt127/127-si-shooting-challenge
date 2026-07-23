import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LevelDetailView, LevelNotFoundState } from "@/components/levels/level-detail-view";
import { LevelsErrorState } from "@/components/levels/levels-ladder-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchLevelDefinition } from "@/lib/airtable/queries";

type LevelDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: LevelDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const level = await fetchLevelDefinition(id);
    if (!level) return { title: "Level not found" };

    return {
      title: level.displayName,
      description: `Reach ${level.displayName} at ${level.xpRequired} lifetime XP.`,
    };
  } catch {
    return { title: "Level" };
  }
}

export default async function LevelDetailPage({ params }: LevelDetailPageProps) {
  const { id } = await params;

  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) {
    notFound();
  }

  try {
    const level = await fetchLevelDefinition(id);
    if (!level) return <LevelNotFoundState />;
    return <LevelDetailView level={level} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <LevelsErrorState message={message} />;
  }
}
