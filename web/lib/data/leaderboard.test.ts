import { describe, expect, it } from "vitest";

import { asNumber, asText } from "@/lib/data/airtable-values";
import {
  buildLeaderboardData,
  compareLeaderboardSortKeys,
  inferSeasonLabel,
  mapEnrollmentToLeaderboardEntry,
  requireEligibleLeaderboardRecords,
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
          "Active?": true,
          Athlete: [{ name: "Jordan Athlete" }],
          "Program Instance": [{ name: "Shooting Challenge | 2026-2027" }],
          "Full Athlete Name": "Jordan S.",
          "School Name Lookup": "Test High",
          Grade: "8",
          "Current Level": [{ name: "Level 3" }],
          "Current Level - Public Facing Display": "Level 3",
          "Level Sort Order - For Softr": 3,
          "Level Status": "Assigned",
          "Athlete Headshot": [{ id: "att1", url: "https://example.com/headshot.jpg", filename: "headshot.jpg" }],
          "Lifetime XP Total": 1500,
          "Total Shots Counted": 900,
        },
      },
      1,
    );

    expect(entry).toMatchObject({
      rank: 1,
      displayName: "Jordan S.",
      school: "Test High",
      grade: "8",
      level: "Level 3",
      headshot: {
        url: "https://example.com/headshot.jpg",
      },
      xp: 1500,
      totalShots: 900,
      publicProfileSlug: null,
    });
  });

  it("maps enabled public profile slug onto leaderboard entries", () => {
    const entry = mapEnrollmentToLeaderboardEntry(
      {
        id: "recTEST2",
        fields: {
          "Level Sort Order - For Softr": 1,
          "Full Athlete Name": "Testing Schmidt",
          "Public Profile Enabled": true,
          "Public Profile Slug": "testing-schmidt",
          "Lifetime XP Total": 81,
          "Total Shots Counted": 100,
        },
      },
      2,
    );
    expect(entry.publicProfileSlug).toBe("testing-schmidt");
  });

  it("ignores slug when public profile is disabled", () => {
    const entry = mapEnrollmentToLeaderboardEntry(
      {
        id: "recTEST3",
        fields: {
          "Level Sort Order - For Softr": 1,
          "Full Athlete Name": "Plain Athlete",
          "Public Profile Enabled": false,
          "Public Profile Slug": "should-not-link",
          "Lifetime XP Total": 0,
          "Total Shots Counted": 0,
        },
      },
      3,
    );
    expect(entry.publicProfileSlug).toBeNull();
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

  it("defaults season label to Current Season when omitted", () => {
    const data = buildLeaderboardData([]);
    expect(data.seasonLabel).toBe("Current Season");
  });
});

describe("leaderboard eligibility contract", () => {
  const PROGRAM_INSTANCE_ID = "rec5mEM0YPqPqq0hZ";
  const scope = {
    schoolYear: "2026-2027",
    programInstanceId: PROGRAM_INSTANCE_ID,
    activeLevelsByName: new Map([["Level 2", { rank: 2, xpRequired: 0 }]]),
  };

  function validRecord(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      fields: {
        "Active?": true,
        Athlete: [{ name: `Athlete ${id}` }],
        "Athlete ID Lookup": [`athlete-${id}`],
        // Live Airtable REST returns linked Program Instance as record ids.
        "Program Instance": [PROGRAM_INSTANCE_ID],
        "School Year": scope.schoolYear,
        "Current Level": [{ name: "Level 2" }],
        "Current Level - Public Facing Display": "Level 2",
        "Level Sort Order - For Softr": 2,
        "Level Status": "Assigned",
        "Lifetime XP Total": 50,
        "Total Shots Counted": 20,
        ...overrides,
      },
    };
  }

  it("accepts only complete, scoped active enrollment rows", () => {
    expect(requireEligibleLeaderboardRecords([validRecord("rec1")], scope)).toHaveLength(1);
  });

  it("accepts a valid Enrollment linked by Program Instance record id from the live REST shape", () => {
    const records = requireEligibleLeaderboardRecords(
      [validRecord("recCrNNAdVmQ4Y8fL", { "Program Instance": ["rec5mEM0YPqPqq0hZ"] })],
      scope,
    );
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("recCrNNAdVmQ4Y8fL");
  });

  it.each([
    ["inactive enrollment", { "Active?": false }],
    ["prior school year", { "School Year": "2025-2026" }],
    ["wrong program instance", { "Program Instance": ["recWrongProgramInst"] }],
    ["display-name program instance link", { "Program Instance": [{ name: "Shooting Challenge | 2026-2027" }] }],
    ["missing athlete", { Athlete: [] }],
    ["multiple athletes", { Athlete: [{ name: "A" }, { name: "B" }] }],
    ["missing stable athlete identity", { "Athlete ID Lookup": [] }],
    ["missing current level", { "Current Level": [] }],
    ["inactive level status", { "Level Status": "Error" }],
    ["blank XP", { "Lifetime XP Total": "" }],
    ["negative XP", { "Lifetime XP Total": -1 }],
    ["blank shots", { "Total Shots Counted": "" }],
    ["negative shots", { "Total Shots Counted": -1 }],
  ])("fails closed for %s", (_label, overrides) => {
    expect(() => requireEligibleLeaderboardRecords([validRecord("rec1", overrides)], scope)).toThrow();
  });

  it("rejects duplicate canonical Athlete + Program Instance + School Year identities", () => {
    const first = validRecord("rec1", { "Athlete ID Lookup": ["same-athlete"] });
    const second = validRecord("rec2", { "Athlete ID Lookup": ["same-athlete"] });
    expect(() => requireEligibleLeaderboardRecords([first, second], scope)).toThrow(/Duplicate canonical/);
  });

  it("rejects an inactive or rank-mismatched Current Level", () => {
    expect(() => requireEligibleLeaderboardRecords([
      validRecord("rec1", { "Level Sort Order - For Softr": 3 }),
    ], scope)).toThrow(/inactive or mismatched/);
  });

  it("rejects a stale Current Level after a downward XP correction", () => {
    const thresholdScope = {
      ...scope,
      activeLevelsByName: new Map([["Level 2", { rank: 2, xpRequired: 200 }]]),
    };
    expect(() => requireEligibleLeaderboardRecords([
      validRecord("rec1", { "Lifetime XP Total": 199 }),
    ], thresholdScope)).toThrow(/below its assigned Current Level threshold/);
  });
});
