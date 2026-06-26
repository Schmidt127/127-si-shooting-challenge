import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

type AthleteProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `Athlete: ${slug} | 127 SI Shooting Challenge`,
  };
}

/**
 * Public athlete profile page (dynamic route).
 * `slug` will map to a stable public identifier from Airtable Enrollments.
 */
export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { slug } = await params;

  return (
    <PlaceholderPage
      title="Athlete Profile"
      description={`Profile route scaffolded for slug: ${slug}. XP, levels, homework, and video progress will load from Airtable.`}
    />
  );
}
