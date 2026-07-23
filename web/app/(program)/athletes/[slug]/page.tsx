import type { Metadata } from "next";

import {
  AthleteProfileEmptyState,
  AthleteProfileErrorState,
  AthleteProfileMissingLinkState,
  AthleteProfileView,
} from "@/components/athlete/athlete-profile-view";
import { loadAthleteProfileResult } from "@/lib/data/athlete-profile";

type AthleteProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadAthleteProfileResult(slug);
  const titleName =
    result.status === "ok" || result.status === "demo" || result.status === "partial"
      ? result.data.athlete.displayName
      : slug;

  return {
    title: `${titleName} | 127 SI Shooting Challenge`,
    robots: { index: false, follow: false },
  };
}

/**
 * Athlete profile (dynamic slug).
 * Demo slugs render labelled mock data; live athletes require SC-112 auth + published links.
 */
export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { slug } = await params;
  const result = await loadAthleteProfileResult(slug);

  switch (result.status) {
    case "ok":
    case "demo":
      return <AthleteProfileView data={result.data} />;
    case "partial":
      return <AthleteProfileView data={result.data} missing={result.missing} />;
    case "not_found":
      return <AthleteProfileEmptyState slug={result.slug} />;
    case "missing_link":
      return (
        <AthleteProfileMissingLinkState slug={result.slug} reason={result.reason} />
      );
    case "error":
      return <AthleteProfileErrorState message={result.message} />;
    default:
      return <AthleteProfileEmptyState slug={slug} />;
  }
}
