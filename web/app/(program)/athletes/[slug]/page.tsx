import type { Metadata } from "next";

import { AthleteProfileEmptyState, AthleteProfileView } from "@/components/athlete/athlete-profile-view";
import { loadAthleteProfile } from "@/lib/data/athlete-profile";

type AthleteProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadAthleteProfile(slug);

  return {
    title: profile
      ? `${profile.athlete.displayName} | 127 SI Shooting Challenge`
      : `Athlete: ${slug} | 127 SI Shooting Challenge`,
    robots: { index: false, follow: false },
  };
}

/**
 * Public athlete profile (dynamic slug).
 * Uses mock/safe adapter until published Enrollment slug views are wired.
 */
export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { slug } = await params;
  const profile = await loadAthleteProfile(slug);

  if (!profile) {
    return <AthleteProfileEmptyState slug={slug} />;
  }

  return <AthleteProfileView data={profile} />;
}
