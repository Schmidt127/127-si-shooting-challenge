import type { Metadata } from "next";

import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

/**
 * Athlete profile SEO policy (FUT-025 / SC-115):
 * - Public HTML may show approved game-related fields (name, school, grade, progress).
 * - Metadata stays privacy-safe: no grade/school in meta description.
 * - Profiles remain noindex until Mike explicitly enables athlete indexing.
 *   Registration consent covers in-page display; search indexing is a separate cutover.
 */
export const ATHLETE_PROFILE_INDEXING_ENABLED = false;

export type AthleteProfileMetadataInput = {
  slug: string;
  displayName: string | null;
  found: boolean;
};

/** Meta description must not echo grade, school, or contact fields. */
export function buildAthleteProfileDescription(displayName: string): string {
  const trimmed = displayName.trim();
  const name = trimmed || "Athlete";
  return `${name} on the 127 SI Shooting Challenge leaderboard.`;
}

export function buildAthleteProfilePageMetadata(
  input: AthleteProfileMetadataInput,
): Metadata {
  const path = `/athletes/${input.slug}`;

  if (!input.found || !input.displayName?.trim()) {
    return buildPageMetadata({
      title: "Athlete profile",
      description: "Athlete profile on the 127 SI Shooting Challenge.",
      path,
      robots: PRIVATE_ROBOTS_NOINDEX,
    });
  }

  const displayName = input.displayName.trim();
  const description = buildAthleteProfileDescription(displayName);

  return buildPageMetadata({
    title: `${displayName} | 127 SI Shooting Challenge`,
    titleAbsolute: true,
    description,
    path,
    robots: PRIVATE_ROBOTS_NOINDEX,
    openGraph: {
      type: "profile",
      title: `${displayName} | Shooting Challenge`,
      description,
    },
  });
}
