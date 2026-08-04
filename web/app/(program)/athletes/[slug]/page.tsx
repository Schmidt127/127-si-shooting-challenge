import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AthleteProfileErrorState,
  AthleteProfileView,
} from "@/components/athlete/athlete-profile-view";
import { PUBLIC_SITE_ORIGIN } from "@/lib/app-config";
import { loadAthleteProfileResult } from "@/lib/data/athlete-profile";
import { formatGrade } from "@/lib/formatters";

type AthleteProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadAthleteProfileResult(slug);

  if (result.status !== "ok") {
    return {
      title: "Athlete profile | 127 SI Shooting Challenge",
      robots: { index: false, follow: false },
    };
  }

  const { identity, performance } = result.data;
  const schoolBit = identity.school ? ` · ${identity.school}` : "";
  const gradeBit = identity.grade ? ` · ${formatGrade(identity.grade)}` : "";
  const description = `${identity.displayName}${schoolBit}${gradeBit} — ${performance.totalShots} shots, ${performance.lifetimeXp} XP in the 127 SI Shooting Challenge.`;

  return {
    title: `${identity.displayName} | 127 SI Shooting Challenge`,
    description,
    alternates: {
      canonical: `${PUBLIC_SITE_ORIGIN}/athletes/${identity.slug}`,
    },
    openGraph: {
      title: `${identity.displayName} | Shooting Challenge`,
      description,
      url: `${PUBLIC_SITE_ORIGIN}/athletes/${identity.slug}`,
      type: "profile",
    },
    robots: { index: false, follow: false },
  };
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
