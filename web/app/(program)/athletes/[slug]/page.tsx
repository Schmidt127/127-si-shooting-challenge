import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AthleteProfileErrorState,
  AthleteProfileView,
} from "@/components/athlete/athlete-profile-view";
import { loadAthleteProfileResult } from "@/lib/data/athlete-profile";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

type AthleteProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadAthleteProfileResult(slug);

  if (result.status !== "ok") {
    return buildPageMetadata({
      title: "Athlete profile",
      description: "Athlete profile on the 127 SI Shooting Challenge.",
      path: `/athletes/${slug}`,
      robots: PRIVATE_ROBOTS_NOINDEX,
    });
  }

  const { identity } = result.data;
  const description = `${identity.displayName} on the 127 SI Shooting Challenge leaderboard.`;

  return buildPageMetadata({
    title: `${identity.displayName} | 127 SI Shooting Challenge`,
    titleAbsolute: true,
    description,
    path: `/athletes/${identity.slug}`,
    robots: PRIVATE_ROBOTS_NOINDEX,
    openGraph: {
      type: "profile",
      title: `${identity.displayName} | Shooting Challenge`,
      description,
    },
  });
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { slug } = await params;
  const result = await loadAthleteProfileResult(slug);

  switch (result.status) {
    case "ok":
      return <AthleteProfileView data={result.data} />;
    case "not_found":
      notFound();
      return null;
    case "error":
      return <AthleteProfileErrorState message={result.message} />;
    default:
      notFound();
      return null;
  }
}
