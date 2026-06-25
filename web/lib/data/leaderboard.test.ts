import { describe, expect, it } from "vitest";

import { asNumber, asText } from "@/lib/data/airtable-values";
import {
  buildLeaderboardData,
  compareLeaderboardSortKeys,
  inferSeasonLabel,
  mapEnrollmentToLeaderboardEntry,
  sortLeaderboardRecords,
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
          "Athlete Headshot": [{ id: "att1", url: "https://example.com/headshot.jpg", filename: "headshot.jpg" }],
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
      levelSortOrder: 0,
      headshot: {
        id: "att1",
        url: "https://example.com/headshot.jpg",
        filename: "headshot.jpg",
      },
      xp: 1500,
      totalShots: 900,
    });
  });

  it("ranks by level, then XP, then total shots", () => {
    const records = [
      {
        id: "recLOW",
        fields: {
          "Full Athlete Name": "Low Level",
          "Level Sort Order - For Softr": 5,
          "Lifetime XP Total": 9999,
          "Total Shots Counted": 9999,
        },
      },
      {
        id: "recHIGH",
        fields: {
          "Full Athlete Name": "High Level",
          "Level Sort Order - For Softr": 8,
          "Lifetime XP Total": 100,
          "Total Shots Counted": 50,
        },
      },
      {
        id: "recMID",
        fields: {
          "Full Athlete Name": "Same Level More XP",
          "Level Sort Order - For Softr": 8,
          "Lifetime XP Total": 500,
          "Total Shots Counted": 100,
        },
      },
      {
        id: "recTIE",
        fields: {
          "Full Athlete Name": "Same Level XP More Shots",
          "Level Sort Order - For Softr": 8,
          "Lifetime XP Total": 500,
          "Total Shots Counted": 250,
        },
      },
    ];

    const sorted = sortLeaderboardRecords(records);
    expect(sorted.map((record) => record.id)).toEqual([
      "recTIE",
      "recMID",
      "recHIGH",
      "recLOW",
    ]);

    const data = buildLeaderboardData(records);
    expect(data.entries.map((entry) => entry.displayName)).toEqual([
      "Same Level XP More Shots",
      "Same Level More XP",
      "High Level",
      "Low Level",
    ]);
  });

  it("compareLeaderboardSortKeys orders level before XP", () => {
    expect(
      compareLeaderboardSortKeys(
        { levelSortOrder: 3, xp: 5000, totalShots: 1000 },
        { levelSortOrder: 4, xp: 100, totalShots: 10 },
      ),
    ).toBeGreaterThan(0);
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
