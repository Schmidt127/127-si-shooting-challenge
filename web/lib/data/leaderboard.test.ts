import { describe, expect, it } from "vitest";

import {
  FIXTURE_LEVEL_2_ID,
  FIXTURE_PROGRAM_INSTANCE_ID,
  FIXTURE_SCHOOL_YEAR,
  standingsEnrollmentFields,
} from "@/lib/airtable/public-rest-fixtures";
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
        fields: standingsEnrollmentFields({
          "Full Athlete Name": "Jordan S.",
          "School Name Lookup": ["Test High"],
          Grade: { id: "sel8", name: "8", color: "blueLight2" },
          "Current Level": [FIXTURE_LEVEL_2_ID],
          "Current Level - Public Facing Display": "Level 3",
          "Level Sort Order - For Softr": [3],
          "Athlete Headshot": [
            { id: "att1", url: "https://example.com/headshot.jpg", filename: "headshot.jpg" },
          ],
          "Lifetime XP Total": 1500,
          "Total Shots Counted": 900,
        }),
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
        fields: standingsEnrollmentFields({
          "Full Athlete Name": "Testing Schmidt",
          "Public Profile Enabled": true,
          "Public Profile Slug": "testing-schmidt",
          "Lifetime XP Total": 81,
          "Total Shots Counted": 100,
          "Level Sort Order - For Softr": [1],
        }),
      },
      2,
    );
    expect(entry.publicProfileSlug).toBe("testing-schmidt");
  });

  it("ignores slug when public profile is disabled", () => {
    const entry = mapEnrollmentToLeaderboardEntry(
      {
        id: "recTEST3",
        fields: standingsEnrollmentFields({
          "Full Athlete Name": "Plain Athlete",
          "Public Profile Enabled": false,
          "Public Profile Slug": "should-not-link",
          "Lifetime XP Total": 0,
          "Total Shots Counted": 0,
          "Level Sort Order - For Softr": [1],
        }),
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
          "Level Sort Order - For Softr": [5],
          "Lifetime XP Total": 9999,
          "Total Shots Counted": 9999,
        },
      },
      {
        id: "recHIGH",
        fields: {
          "Full Athlete Name": "High Level",
          "Level Sort Order - For Softr": [8],
          "Lifetime XP Total": 100,
          "Total Shots Counted": 50,
        },
      },
      {
        id: "recMID",
        fields: {
          "Full Athlete Name": "Same Level More XP",
          "Level Sort Order - For Softr": [8],
          "Lifetime XP Total": 500,
          "Total Shots Counted": 100,
        },
      },
      {
        id: "recTIE",
        fields: {
          "Full Athlete Name": "Same Level XP More Shots",
          "Level Sort Order - For Softr": [8],
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
  const scope = {
    schoolYear: FIXTURE_SCHOOL_YEAR,
    programInstanceId: FIXTURE_PROGRAM_INSTANCE_ID,
    activeLevelsById: new Map([
      [FIXTURE_LEVEL_2_ID, { name: "Level 2", rank: 2, xpRequired: 0 }],
    ]),
  };

  function validRecord(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      fields: standingsEnrollmentFields({
        "Athlete ID Lookup": [`athlete-${id}`],
        Athlete: [`recAthlete${id.slice(-8).padStart(8, "0")}`],
        ...overrides,
      }),
    };
  }

  it("accepts only complete, scoped active enrollment rows", () => {
    expect(requireEligibleLeaderboardRecords([validRecord("rec1xxxxxxx0001")], scope)).toHaveLength(1);
  });

  it("accepts a valid Enrollment linked by Program Instance record id from the live REST shape", () => {
    const records = requireEligibleLeaderboardRecords(
      [validRecord("recCrNNAdVmQ4Y8fL", { "Program Instance": ["rec5mEM0YPqPqq0hZ"] })],
      scope,
    );
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("recCrNNAdVmQ4Y8fL");
  });

  it("accepts a valid Current Level record-id link with matching display name and lookup rank array", () => {
    const records = requireEligibleLeaderboardRecords(
      [
        validRecord("recCrNNAdVmQ4Y8fL", {
          "Current Level": [FIXTURE_LEVEL_2_ID],
          "Current Level - Public Facing Display": "Level 2",
          "Level Sort Order - For Softr": [2],
        }),
      ],
      scope,
    );
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("recCrNNAdVmQ4Y8fL");
  });

  it.each([
    ["inactive enrollment", { "Active?": false }],
    ["prior school year", { "School Year": { id: "selOld", name: "2025-2026", color: "gray" } }],
    ["wrong program instance", { "Program Instance": ["recWrongProgramInst"] }],
    ["display-name program instance link", { "Program Instance": [{ name: "Shooting Challenge | 2026-2027" }] }],
    ["missing athlete", { Athlete: [] }],
    ["multiple athletes", { Athlete: ["recAthleteAAAAAAA1", "recAthleteAAAAAAA2"] }],
    ["missing stable athlete identity", { "Athlete ID Lookup": [] }],
    ["missing current level", { "Current Level": [] }],
    ["display-name current level link", { "Current Level": [{ name: "Level 2" }] }],
    ["mismatched current level display", { "Current Level - Public Facing Display": "Level 9" }],
    ["inactive level status", { "Level Status": { id: "selErr", name: "Error", color: "red" } }],
    ["blank XP", { "Lifetime XP Total": "" }],
    ["negative XP", { "Lifetime XP Total": -1 }],
    ["blank shots", { "Total Shots Counted": "" }],
    ["negative shots", { "Total Shots Counted": -1 }],
  ])("skips ineligible row for %s without blanking sibling rows", (_label, overrides) => {
    const good = validRecord("recGoodxxxx0001", { "Athlete ID Lookup": ["athlete-good"] });
    const bad = validRecord("recBadxxxxx0001", overrides);
    const eligible = requireEligibleLeaderboardRecords([good, bad], scope);
    expect(eligible.map((record) => record.id)).toEqual(["recGoodxxxx0001"]);
  });

  it("returns an empty list when every row is ineligible (legitimate empty board)", () => {
    expect(
      requireEligibleLeaderboardRecords(
        [validRecord("rec1xxxxxxx0001", { "Active?": false })],
        scope,
      ),
    ).toEqual([]);
  });

  it("keeps the higher-ranked enrollment when duplicate canonical identities appear", () => {
    const lower = validRecord("rec1xxxxxxx0001", {
      "Athlete ID Lookup": ["same-athlete"],
      "Lifetime XP Total": 100,
      "Total Shots Counted": 50,
    });
    const higher = validRecord("rec2xxxxxxx0002", {
      "Athlete ID Lookup": ["same-athlete"],
      "Lifetime XP Total": 400,
      "Total Shots Counted": 50,
    });
    const eligible = requireEligibleLeaderboardRecords([lower, higher], scope);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe("rec2xxxxxxx0002");
  });

  it("breaks duplicate ties by stable record id", () => {
    const first = validRecord("recAxxxxxxx0001", {
      "Athlete ID Lookup": ["same-athlete"],
      "Lifetime XP Total": 200,
      "Total Shots Counted": 100,
    });
    const second = validRecord("recBxxxxxxx0002", {
      "Athlete ID Lookup": ["same-athlete"],
      "Lifetime XP Total": 200,
      "Total Shots Counted": 100,
    });
    const eligible = requireEligibleLeaderboardRecords([second, first], scope);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe("recAxxxxxxx0001");
  });

  it("skips an inactive or rank-mismatched Current Level", () => {
    expect(
      requireEligibleLeaderboardRecords(
        [validRecord("rec1xxxxxxx0001", { "Level Sort Order - For Softr": [3] })],
        scope,
      ),
    ).toEqual([]);
  });

  it("skips an unknown Current Level record id", () => {
    expect(
      requireEligibleLeaderboardRecords(
        [validRecord("rec1xxxxxxx0001", { "Current Level": ["recUnknownLevelXXX"] })],
        scope,
      ),
    ).toEqual([]);
  });

  it("skips a stale Current Level after a downward XP correction", () => {
    const thresholdScope = {
      ...scope,
      activeLevelsById: new Map([
        [FIXTURE_LEVEL_2_ID, { name: "Level 2", rank: 2, xpRequired: 200 }],
      ]),
    };
    expect(
      requireEligibleLeaderboardRecords(
        [validRecord("rec1xxxxxxx0001", { "Lifetime XP Total": 199 })],
        thresholdScope,
      ),
    ).toEqual([]);
  });
});
