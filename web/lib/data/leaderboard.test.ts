import { describe, expect, it } from "vitest";

import { asNumber, asText } from "@/lib/data/airtable-values";
import {
  buildLeaderboardData,
  inferSeasonLabel,
  mapEnrollmentToLeaderboardEntry,
} from "@/lib/data/leaderboard";

describe("asText", () => {
  it("normalizes strings and linked-record names", () => {
    expect(asText("  Alex  ")).toBe("Alex");
    expect(asText({ name: "Lincoln High" })).toBe("Lincoln High");
    expect(asText(null, "fallback")).toBe("fallback");
  });
});

describe("asNumber", () => {
  it("parses numbers and comma-formatted strings", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber("1,250")).toBe(1250);
    expect(asNumber("bad")).toBe(0);
  });
});

describe("leaderboard mapping", () => {
  it("maps enrollment fields to ranked entries", () => {
    const entry = mapEnrollmentToLeaderboardEntry(
      {
        id: "recTEST",
        fields: {
          "Full Athlete Name": "Jordan S.",
          "School Name Lookup": "Test High",
          Grade: "8",
          "Current Level - Public Facing Display": "Level 3",
          "Lifetime XP Total": 1500,
          "Total Shots Counted": 900,
        },
      },
      1,
    );

    expect(entry).toMatchObject({
      id: "recTEST",
      rank: 1,
      displayName: "Jordan S.",
      school: "Test High",
      grade: "8",
      level: "Level 3",
      xp: 1500,
      totalShots: 900,
    });
  });

  it("builds season label from school year", () => {
    const label = inferSeasonLabel([
      { fields: { "School Year": "2025-2026" } },
      { fields: { "School Year": "" } },
    ]);

    expect(label).toBe("2025-2026 Season");
  });

  it("returns leaderboard data with updatedAt", () => {
    const data = buildLeaderboardData([], "2025-2026 Season");

    expect(data.entries).toEqual([]);
    expect(data.seasonLabel).toBe("2025-2026 Season");
    expect(data.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
