/**
 * Public athlete profile loader — Airtable-backed, privacy-safe.
 */

import { fetchPublicAthleteProfileBySlug } from "@/lib/airtable/queries";
import {
  isValidPublicSlug,
  normalizeProfileSlug,
} from "@/lib/data/public-athlete-profile";
import type { PublicAthleteProfile } from "@/types/public-athlete-profile";

export type { PublicAthleteProfile } from "@/types/public-athlete-profile";

export type AthleteProfileLoadResult =
  | { status: "ok"; data: PublicAthleteProfile }
  | { status: "not_found"; slug: string }
  | { status: "error"; slug: string; message: string };

export { normalizeProfileSlug, isValidPublicSlug };

/**
 * Resolve a public athlete profile by slug.
 * Missing, disabled, inactive, invalid, and duplicate slugs → not_found.
 */
export async function loadAthleteProfileResult(
  slug: string,
): Promise<AthleteProfileLoadResult> {
  const cleaned = normalizeProfileSlug(slug);
  if (!cleaned || !isValidPublicSlug(cleaned)) {
    return { status: "not_found", slug: String(slug || "").trim() || "(empty)" };
  }

  try {
    const data = await fetchPublicAthleteProfileBySlug(cleaned);
    if (!data) {
      return { status: "not_found", slug: cleaned };
    }
    return { status: "ok", data };
  } catch {
    return {
      status: "error",
      slug: cleaned,
      message: "Something went wrong loading this profile.",
    };
  }
}

export async function loadAthleteProfile(
  slug: string,
): Promise<PublicAthleteProfile | null> {
  const result = await loadAthleteProfileResult(slug);
  return result.status === "ok" ? result.data : null;
}
