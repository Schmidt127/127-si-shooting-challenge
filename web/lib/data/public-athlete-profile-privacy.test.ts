import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PUBLIC_PROFILE_ENROLLMENT_FIELDS } from "@/lib/airtable/queries";
import { buildPublicAthleteProfile } from "@/lib/data/public-athlete-profile";

const WEB_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(WEB_ROOT, relativePath), "utf-8");
}

const FORBIDDEN_FIELD_PATTERNS = [
  /email/i,
  /phone/i,
  /cell/i,
  /address/i,
  /parent/i,
  /guardian/i,
  /birth/i,
  /stripe/i,
  /payment/i,
  /fillout/i,
  /reason debug/i,
  /source key/i,
];

const FORBIDDEN_SERIALIZED_PATTERNS = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /\brec[a-zA-Z0-9]{14}\b/,
  /parent email/i,
  /stripe/i,
  /xp reason debug/i,
  /source key/i,
];

describe("PUBLIC_PROFILE_ENROLLMENT_FIELDS allowlist", () => {
  it("requests only presentation-safe enrollment fields", () => {
    for (const field of PUBLIC_PROFILE_ENROLLMENT_FIELDS) {
      for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
        expect(field, `forbidden field name: ${field}`).not.toMatch(pattern);
      }
    }
  });

  it("does not request raw contact or payment columns by name", () => {
    const haystack = PUBLIC_PROFILE_ENROLLMENT_FIELDS.join("\n").toLowerCase();
    expect(haystack).not.toContain("parent email");
    expect(haystack).not.toContain("guardian");
    expect(haystack).not.toContain("stripe");
  });
});

describe("buildPublicAthleteProfile privacy serialization", () => {
  it("never serializes Airtable record ids, emails, or debug fields", () => {
    const profile = buildPublicAthleteProfile({
      slug: "privacy-athlete",
      fields: {
        "Full Athlete Name": "Privacy Athlete",
        "School Name Lookup": "Fairfield School",
        Grade: "7",
        "School Year": "2026-2027",
        "Public Profile Enabled": true,
        "Public Profile Slug": "privacy-athlete",
        "Active?": true,
        "Lifetime XP Total": 120,
        "Total Shots Counted": 500,
        "XP Reason Debug": "SHOULD_NOT_APPEAR",
        "Parent Email": "parent@example.com",
      },
      rank: 4,
      nextLevelName: "Developing Shooter",
      recentActivity: [
        {
          key: "opaque-row-key",
          kind: "xp",
          date: "2026-08-01",
          title: "Perfect Week bonus",
          detail: null,
          shots: null,
          makes: null,
          xp: 25,
          hasDetailedStats: false,
        },
      ],
      weekly: [],
      achievements: [],
    });

    const serialized = JSON.stringify(profile);
    for (const pattern of FORBIDDEN_SERIALIZED_PATTERNS) {
      expect(serialized, `leak matched ${pattern}`).not.toMatch(pattern);
    }

    expect(profile.identity.displayName).toBe("Privacy Athlete");
    expect(profile.identity.school).toBe("Fairfield School");
    expect(profile.identity.grade).toBe("7");
    expect(Object.keys(profile.identity)).not.toContain("id");
  });

  it("uses opaque activity keys instead of Airtable ids", () => {
    const profile = buildPublicAthleteProfile({
      slug: "activity-athlete",
      fields: { "Full Athlete Name": "Activity Athlete" },
      rank: null,
      nextLevelName: null,
      recentActivity: [
        {
          key: "opaque-game-log-key",
          kind: "submission",
          date: "2026-08-02",
          title: "Shooting session",
          detail: "50 shots",
          shots: 50,
          makes: null,
          xp: null,
          hasDetailedStats: false,
        },
      ],
      weekly: [],
      achievements: [],
    });

    expect(profile.recentActivity[0]?.key).toBe("opaque-game-log-key");
    expect(profile.recentActivity[0]?.key).not.toMatch(/^rec/);
  });
});

describe("athlete profile page metadata wiring", () => {
  it("routes athlete metadata through the shared privacy-safe builder", () => {
    const pageSource = readSource("app/(program)/athletes/[slug]/page.tsx");
    expect(pageSource).toContain("buildAthleteProfilePageMetadata");
    expect(pageSource).not.toContain("PRIVATE_ROBOTS_NOINDEX");
  });
});

describe("public homework query allowlist", () => {
  it("does not request coach feedback or tokenized reviewer file URLs", () => {
    const source = readSource("lib/airtable/public-athlete-homework-queries.ts");
    expect(source).not.toMatch(/"Coach Feedback"/);
    expect(source).not.toMatch(/Reviewer File URL/);
    expect(source).toContain("Completion Status");
    expect(source).toContain("Base XP Awarded");
  });

  it("public homework UI source never renders coach quotes or file CTAs", () => {
    const source = readSource("components/athlete/homework-assignments.tsx");
    expect(source).not.toContain("CoachFeedbackQuote");
    expect(source).not.toContain("viewSubmittedHomeworkHref");
    expect(source).not.toContain("View Submitted Homework");
    expect(source).not.toMatch(/coach feedback/i);
  });
});
