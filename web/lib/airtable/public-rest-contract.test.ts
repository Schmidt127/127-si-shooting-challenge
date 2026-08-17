import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AIRTABLE_TABLES } from "@/lib/airtable/queries";
import {
  PUBLIC_AIRTABLE_TABLES,
  PUBLIC_ENROLLMENT_VIEW,
  REGISTERING_SHOOTING_CHALLENGE_FILTER,
} from "@/lib/airtable/public-tables";
import {
  FIXTURE_LEVEL_2_ID,
  FIXTURE_PROGRAM_INSTANCE_ID,
  FIXTURE_SCHOOL_YEAR,
  standingsEnrollmentFields,
} from "@/lib/airtable/public-rest-fixtures";
import {
  AirtableFieldError,
  linkedRecordIds,
  requireExactlyOneLinkedRecordId,
  requireExactlyOneLookupNumber,
  requireExactlyOneLookupText,
  requireSelectName,
  selectName,
} from "@/lib/data/airtable-values";
import { requireEligibleLeaderboardRecords } from "@/lib/data/leaderboard";

const WEB_ROOT = path.resolve(__dirname, "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(WEB_ROOT, relativePath), "utf-8");
}

describe("public Airtable table registry", () => {
  it("pins live Program Instance Sync and Enrollments table ids", () => {
    expect(PUBLIC_AIRTABLE_TABLES.programInstanceSync).toEqual({
      name: "Program Instance - Sync",
      id: "tblMfALZa4YYUy70P",
    });
    expect(PUBLIC_AIRTABLE_TABLES.enrollments).toEqual({
      name: "Enrollments",
      id: "tbl3PFmwbRoabu1YV",
    });
    expect(AIRTABLE_TABLES.programInstanceSync).toBe("Program Instance - Sync");
    expect(AIRTABLE_TABLES.enrollments).toBe("Enrollments");
  });

  it("keeps Registering Shooting Challenge filter and Web - Leaderboard boundary", () => {
    expect(REGISTERING_SHOOTING_CHALLENGE_FILTER).toBe(
      "AND({Program - Linked}='Shooting Challenge',{Status}='Registering')",
    );
    expect(PUBLIC_ENROLLMENT_VIEW).toBe("Web - Leaderboard");
  });

  it("pins Tutorials & Assets as the public media table", () => {
    expect(PUBLIC_AIRTABLE_TABLES.tutorials).toEqual({
      name: "Tutorials & Assets",
      id: "tblDOTgsWfqPm18bw",
    });
    expect(AIRTABLE_TABLES.tutorials).toBe("Tutorials & Assets");
  });
});

describe("public REST shape normalization contract", () => {
  it("extracts linked record ids and rejects display-name-only link arrays", () => {
    expect(linkedRecordIds(["recABC12345678901"])).toEqual(["recABC12345678901"]);
    expect(linkedRecordIds([{ id: "recABC12345678901", name: "Level 2" }])).toEqual([
      "recABC12345678901",
    ]);
    expect(linkedRecordIds([{ name: "Level 2" }])).toEqual([]);
    expect(() =>
      requireExactlyOneLinkedRecordId([{ name: "Level 2" }], "Current Level", "Enrollment recX"),
    ).toThrow(AirtableFieldError);
  });

  it("unwraps lookup one-item arrays for numbers and text", () => {
    expect(requireExactlyOneLookupNumber([2], "Level Rank", "Enrollment recX")).toBe(2);
    expect(requireExactlyOneLookupNumber(2, "Level Rank", "Enrollment recX")).toBe(2);
    expect(requireExactlyOneLookupText(["athlete-1"], "Athlete ID Lookup", "Enrollment recX")).toBe(
      "athlete-1",
    );
    expect(() => requireExactlyOneLookupNumber([], "Level Rank", "Enrollment recX")).toThrow(
      /exactly one lookup value, found 0/,
    );
    expect(() => requireExactlyOneLookupNumber([1, 2], "Level Rank", "Enrollment recX")).toThrow(
      /found 2/,
    );
  });

  it("reads select objects and rejects empty/multiple select lookups", () => {
    expect(selectName({ id: "sel1", name: "Assigned", color: "greenBright" })).toBe("Assigned");
    expect(requireSelectName({ id: "sel1", name: "8", color: "blueLight2" }, "Grade", "recX")).toBe(
      "8",
    );
    expect(() => requireSelectName([], "Grade", "recX")).toThrow(/found 0/);
    expect(() =>
      requireSelectName(
        [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ],
        "Grade",
        "recX",
      ),
    ).toThrow(/found 2/);
  });
});

describe("standings eligibility against live REST fixtures", () => {
  const scope = {
    schoolYear: FIXTURE_SCHOOL_YEAR,
    programInstanceId: FIXTURE_PROGRAM_INSTANCE_ID,
    activeLevelsById: new Map([
      [FIXTURE_LEVEL_2_ID, { name: "Level 2", rank: 2, xpRequired: 0 }],
    ]),
  };

  it("accepts Program Instance + Current Level record ids with lookup rank arrays", () => {
    const records = requireEligibleLeaderboardRecords(
      [{ id: "recCrNNAdVmQ4Y8fL", fields: standingsEnrollmentFields() }],
      scope,
    );
    expect(records).toHaveLength(1);
  });

  it("fails closed when Current Level is a display-name object instead of a record id", () => {
    expect(() =>
      requireEligibleLeaderboardRecords(
        [
          {
            id: "recBadLevel",
            fields: standingsEnrollmentFields({
              "Current Level": [{ name: "Level 2" }],
            }),
          },
        ],
        scope,
      ),
    ).toThrow(/exactly one Current Level/);
  });

  it("fails closed when Level Sort Order lookup is empty or multi-valued", () => {
    expect(() =>
      requireEligibleLeaderboardRecords(
        [
          {
            id: "recBadRank",
            fields: standingsEnrollmentFields({
              "Level Sort Order - For Softr": [],
            }),
          },
        ],
        scope,
      ),
    ).toThrow(/Level Rank/);
    expect(() =>
      requireEligibleLeaderboardRecords(
        [
          {
            id: "recBadRank2",
            fields: standingsEnrollmentFields({
              "Level Sort Order - For Softr": [2, 3],
            }),
          },
        ],
        scope,
      ),
    ).toThrow(/Level Rank/);
  });
});

describe("source guardrails against display-name relational checks", () => {
  it("leaderboard eligibility uses linked record id helpers for Program Instance and Current Level", () => {
    const source = readSource(path.join("data", "leaderboard.ts"));
    expect(source).toContain("requireExactlyOneLinkedRecordId(fields[\"Program Instance\"]");
    expect(source).toContain("requireExactlyOneLinkedRecordId(fields[\"Current Level\"]");
    expect(source).toContain("requireExactlyOneLookupNumber");
    expect(source).not.toMatch(/publicLevel\s*!==\s*currentLevel/);
    expect(source).not.toContain("activeLevelsByName");
    expect(source).not.toContain("linkedTokens");
  });

  it("standings and homework share the Registering Program Instance resolver", () => {
    const queries = readSource(path.join("airtable", "queries.ts"));
    const homework = readSource(path.join("airtable", "homework-queries.ts"));
    expect(queries).toContain("resolveRegisteringShootingChallengeProgramInstance");
    expect(homework).toContain("resolveRegisteringShootingChallengeProgramInstance");
    expect(queries).not.toContain('tableName: "Config"');
    expect(homework).not.toContain('tableName: "Config"');
  });
});
