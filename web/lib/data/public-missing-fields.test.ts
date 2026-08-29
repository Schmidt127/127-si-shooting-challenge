import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildPublicAthleteProfile } from "@/lib/data/public-athlete-profile";

const QUERIES = readFileSync(
  join(process.cwd(), "lib/airtable/queries.ts"),
  "utf8"
);

const PROTECTED_PUBLIC_MISSING = [
  "Public Missing Homework",
  "Public Missing Zoom",
  "Public Missing Streak",
] as const;

describe("public profile Public Missing fields", () => {
  it("queries still request the three Public Missing gate fields", () => {
    for (const field of PROTECTED_PUBLIC_MISSING) {
      expect(QUERIES).toContain(`"${field}"`);
    }
    expect(QUERIES).not.toContain("Welcome Email Ready?");
    expect(QUERIES).not.toContain("Parent Email Subject");
  });

  it("maps Public Missing Homework/Zoom/Streak into progression.missingRequirements", () => {
    const profile = buildPublicAthleteProfile({
      slug: "testing-schmidt",
      fields: {
        "Full Athlete Name": "Testing Schmidt",
        "Public Profile Enabled": true,
        "Public Profile Slug": "testing-schmidt",
        "Active?": true,
        "Public Missing Homework": "Homework",
        "Public Missing Zoom": "Zoom",
        "Public Missing Streak": "Streak",
        "Public Missing Submissions": "",
        "Public Missing Videos": "",
      },
      rank: null,
      nextLevelName: null,
      recentActivity: [],
      weekly: [],
      achievements: [],
    });

    expect(profile.progression.missingRequirements).toEqual([
      "Homework",
      "Zoom",
      "Streak",
    ]);
  });
});
