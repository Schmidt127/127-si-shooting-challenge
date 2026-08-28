import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AthleteProfileErrorState,
  AthleteProfileView,
} from "@/components/athlete/athlete-profile-view";
import { loadAthleteProfileResult } from "@/lib/data/athlete-profile";
import { buildAthleteProfilePageMetadata } from "@/lib/seo/athlete-profile-metadata";

type AthleteProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadAthleteProfileResult(slug);

  if (result.status !== "ok") {
    return buildAthleteProfilePageMetadata({
      slug,
      displayName: null,
      found: false,
    });
  }

  const { identity } = result.data;

  return buildAthleteProfilePageMetadata({
    slug: identity.slug,
    displayName: identity.displayName,
    found: true,
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
