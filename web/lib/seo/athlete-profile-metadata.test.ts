import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAthleteProfileDescription,
  buildAthleteProfilePageMetadata,
  isAthleteProfileIndexingEnabled,
} from "./athlete-profile-metadata";
import {
  DEFAULT_ROBOTS_INDEX,
  PRIVATE_ROBOTS_NOINDEX,
  resolveAthleteProfileRobots,
} from "./metadata";

describe("isAthleteProfileIndexingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to false when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "");
    expect(isAthleteProfileIndexingEnabled()).toBe(false);
  });

  it("enables athlete indexing for true or 1", () => {
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "true");
    expect(isAthleteProfileIndexingEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "1");
    expect(isAthleteProfileIndexingEnabled()).toBe(true);
  });

  it("stays disabled for false values", () => {
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "false");
    expect(isAthleteProfileIndexingEnabled()).toBe(false);
  });
});

describe("resolveAthleteProfileRobots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns noindex when athlete flag is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "");
    expect(resolveAthleteProfileRobots()).toEqual(PRIVATE_ROBOTS_NOINDEX);
  });

  it("returns noindex when only athlete flag is true (fail-closed)", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "");
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "true");
    expect(resolveAthleteProfileRobots()).toEqual(PRIVATE_ROBOTS_NOINDEX);
  });

  it("returns indexable robots when both cutover flags are true", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "true");
    expect(resolveAthleteProfileRobots()).toEqual(DEFAULT_ROBOTS_INDEX);
  });
});

describe("buildAthleteProfileDescription", () => {
  it("uses display name without grade or school", () => {
    const description = buildAthleteProfileDescription("Jordan Smith");
    expect(description).toContain("Jordan Smith");
    expect(description.toLowerCase()).not.toContain("grade");
    expect(description.toLowerCase()).not.toContain("school");
  });

  it("falls back when name is blank", () => {
    expect(buildAthleteProfileDescription("   ")).toContain("Athlete");
  });
});

describe("buildAthleteProfilePageMetadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps profiles noindex by default with unique canonical paths per slug", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "");

    const alpha = buildAthleteProfilePageMetadata({
      slug: "alpha-athlete",
      displayName: "Alpha Athlete",
      found: true,
    });
    const bravo = buildAthleteProfilePageMetadata({
      slug: "bravo-athlete",
      displayName: "Bravo Athlete",
      found: true,
    });

    expect(alpha.robots).toEqual(PRIVATE_ROBOTS_NOINDEX);
    expect(bravo.robots).toEqual(PRIVATE_ROBOTS_NOINDEX);
    expect(alpha.alternates?.canonical).not.toBe(bravo.alternates?.canonical);
    expect(alpha.openGraph?.title).not.toBe(bravo.openGraph?.title);
  });

  it("allows indexable robots only when both cutover flags are true", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "true");

    const metadata = buildAthleteProfilePageMetadata({
      slug: "indexed-athlete",
      displayName: "Indexed Athlete",
      found: true,
    });

    expect(metadata.robots).toEqual(DEFAULT_ROBOTS_INDEX);
  });

  it("omits sensitive detail from meta description for found profiles", () => {
    const metadata = buildAthleteProfilePageMetadata({
      slug: "testing-schmidt",
      displayName: "Testing Schmidt",
      found: true,
    });

    const description = String(metadata.description ?? "");
    const ogDescription = String(metadata.openGraph?.description ?? "");
    const twitterDescription = String(metadata.twitter?.description ?? "");

    for (const text of [description, ogDescription, twitterDescription]) {
      expect(text.toLowerCase()).not.toMatch(/\bgrade\b/);
      expect(text.toLowerCase()).not.toMatch(/\bschool\b/);
      expect(text).not.toMatch(/@/);
    }
  });

  it("omits grade and school even when indexing flags are enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", "true");
    vi.stubEnv("NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING", "true");

    const metadata = buildAthleteProfilePageMetadata({
      slug: "indexed-athlete",
      displayName: "Indexed Athlete",
      found: true,
    });

    const serialized = JSON.stringify({
      description: metadata.description,
      openGraph: metadata.openGraph,
      twitter: metadata.twitter,
      title: metadata.title,
    });

    expect(serialized.toLowerCase()).not.toMatch(/\bgrade\b/);
    expect(serialized.toLowerCase()).not.toMatch(/\bschool\b/);
    expect(serialized).not.toMatch(/@/);
  });

  it("uses generic copy for not-found metadata shells", () => {
    const metadata = buildAthleteProfilePageMetadata({
      slug: "missing-athlete",
      displayName: null,
      found: false,
    });

    expect(metadata.robots).toEqual(PRIVATE_ROBOTS_NOINDEX);
    expect(String(metadata.description)).toContain("Athlete profile");
  });
});
