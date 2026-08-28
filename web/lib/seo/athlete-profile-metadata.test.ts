import { describe, expect, it } from "vitest";

import {
  buildAthleteProfileDescription,
  buildAthleteProfilePageMetadata,
} from "./athlete-profile-metadata";
import { PRIVATE_ROBOTS_NOINDEX } from "./metadata";

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
  it("keeps profiles noindex with unique canonical paths per slug", () => {
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

  it("omits sensitive detail from meta description for found profiles", () => {
    const metadata = buildAthleteProfilePageMetadata({
      slug: "testing-schmidt",
      displayName: "Testing Schmidt",
      found: true,
    });

    const description = String(metadata.description ?? "");
    expect(description.toLowerCase()).not.toMatch(/\bgrade\b/);
    expect(description.toLowerCase()).not.toMatch(/\bschool\b/);
    expect(description).not.toMatch(/@/);
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
