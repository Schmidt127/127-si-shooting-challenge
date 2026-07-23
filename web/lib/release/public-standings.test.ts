import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LEADERBOARD_FIELDS } from "@/lib/airtable/queries";
import {
  buildLeaderboardData,
  sortLeaderboardRecords,
} from "@/lib/data/leaderboard";

/**
 * Public standings guarantees (SC-004 direction + Package F):
 * 1. Schmidt (and every athlete) is rendered normally — the web app is
 *    name-blind; any testing-enrollment exclusion happens only in the
 *    Airtable `Web - Leaderboard` view filter that Mike controls.
 * 2. No private/contact fields are requested or rendered.
 */

const WEB_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(WEB_ROOT, relativePath), "utf-8");
}

describe("Schmidt visibility", () => {
  it("renders a Schmidt enrollment like any other athlete", () => {
    const data = buildLeaderboardData([
      {
        id: "recSCHMIDT0000001",
        fields: {
          "Full Athlete Name": "Schmidt Test Athlete",
          "Level Sort Order - For Softr": 2,
          "Lifetime XP Total": 300,
          "Total Shots Counted": 150,
        },
      },
      {
        id: "recOTHER000000001",
        fields: {
          "Full Athlete Name": "Other Athlete",
          "Level Sort Order - For Softr": 3,
          "Lifetime XP Total": 500,
          "Total Shots Counted": 200,
        },
      },
    ]);

    const names = data.entries.map((entry) => entry.displayName);
    expect(names).toContain("Schmidt Test Athlete");
    expect(data.entries.find((entry) => entry.displayName === "Schmidt Test Athlete")?.rank).toBe(2);
  });

  it("has no name-based exclusion filters in leaderboard code", () => {
    const sources = [
      readSource(path.join("lib", "airtable", "queries.ts")),
      readSource(path.join("lib", "data", "leaderboard.ts")),
    ];

    for (const source of sources) {
      expect(source.toLowerCase()).not.toContain("schmidt");
    }
  });
});

describe("privacy-safe fields", () => {
  const FORBIDDEN_FIELD_PATTERNS = [
    /email/i,
    /phone/i,
    /cell/i,
    /address/i,
    /parent/i,
    /birth/i,
    /guardian/i,
  ];

  it("leaderboard requests only presentation-safe fields", () => {
    for (const field of LEADERBOARD_FIELDS) {
      for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
        expect(field).not.toMatch(pattern);
      }
    }
  });

  it("leaderboard entries expose no contact keys", () => {
    const data = buildLeaderboardData([
      {
        id: "recX00000000000001",
        fields: {
          "Full Athlete Name": "Any Athlete",
          "Lifetime XP Total": 10,
        },
      },
    ]);

    const entryKeys = Object.keys(data.entries[0]);
    for (const key of entryKeys) {
      for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
        expect(key).not.toMatch(pattern);
      }
    }
  });
});

describe("deterministic tie ordering", () => {
  it("orders full ties by name then id so ranks are stable across fetches", () => {
    const tied = (id: string, name: string) => ({
      id,
      fields: {
        "Full Athlete Name": name,
        "Level Sort Order - For Softr": 4,
        "Lifetime XP Total": 100,
        "Total Shots Counted": 50,
      },
    });

    const forward = sortLeaderboardRecords([
      tied("rec2", "Bravo"),
      tied("rec1", "Alpha"),
      tied("rec3", "Alpha"),
    ]);
    const reversed = sortLeaderboardRecords([
      tied("rec3", "Alpha"),
      tied("rec1", "Alpha"),
      tied("rec2", "Bravo"),
    ]);

    expect(forward.map((record) => record.id)).toEqual(["rec1", "rec3", "rec2"]);
    expect(reversed.map((record) => record.id)).toEqual(forward.map((record) => record.id));
  });
});
