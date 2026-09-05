import { beforeEach, describe, expect, it, vi } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import { fetchLeaderboard } from "@/lib/airtable/queries";
import { AirtableApiError } from "@/lib/airtable/errors";
import {
  FIXTURE_LEVEL_2_ID,
  FIXTURE_PROGRAM_INSTANCE_ID,
  FIXTURE_PROGRAM_INSTANCE_NAME,
  FIXTURE_SCHOOL_YEAR,
  activeLevel2Fields,
  registeringProgramInstanceFields,
  standingsEnrollmentFields,
} from "@/lib/airtable/public-rest-fixtures";

const REGISTERING_FILTER =
  "AND({Program - Linked}='Shooting Challenge',{Status}='Registering')";

function enrollment(id: string, athleteName: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    fields: standingsEnrollmentFields({
      Athlete: [`recAthlete${id.slice(-8)}`],
      "Athlete ID Lookup": [`athlete-${id}`],
      "Full Athlete Name": athleteName,
      "Current Level": [FIXTURE_LEVEL_2_ID],
      ...overrides,
    }),
  };
}

function registeringProgramInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: FIXTURE_PROGRAM_INSTANCE_ID,
    fields: registeringProgramInstanceFields(overrides),
  };
}

function installQueryMock(records: ReturnType<typeof enrollment>[]) {
  listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
    if (params.tableName === "Program Instance - Sync") {
      return { records: [registeringProgramInstance()] };
    }
    if (params.tableName === "Levels") {
      return {
        records: [{
          id: FIXTURE_LEVEL_2_ID,
          fields: activeLevel2Fields(),
        }],
      };
    }
    if (params.tableName === "Enrollments") return { records };
    throw new Error(`Unexpected table ${params.tableName}`);
  });
}

describe("fetchLeaderboard Airtable adapter", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  it("resolves season from the Registering Shooting Challenge Program Instance without reading Config", async () => {
    installQueryMock([
      enrollment("recAxxxxxxx00001", "Avery", { "Lifetime XP Total": 200 }),
      enrollment("recBxxxxxxx00002", "Blair", { "Lifetime XP Total": 300 }),
    ]);

    const data = await fetchLeaderboard();

    expect(data.entries.map((entry) => entry.displayName)).toEqual(["Blair", "Avery"]);
    expect(data.entries.every((entry) => !("id" in entry))).toBe(true);

    const programCall = listAirtableRecordsMock.mock.calls.find(
      ([params]) => params.tableName === "Program Instance - Sync",
    )?.[0];
    expect(programCall).toMatchObject({
      filterByFormula: REGISTERING_FILTER,
      revalidateSeconds: 120,
    });
    expect(listAirtableRecordsMock.mock.calls.every(
      ([params]) => params.tableName !== "Config",
    )).toBe(true);

    const enrollmentCall = listAirtableRecordsMock.mock.calls.find(
      ([params]) => params.tableName === "Enrollments",
    )?.[0];
    expect(enrollmentCall).toMatchObject({ view: "Web - Leaderboard", revalidateSeconds: 120 });
    expect(enrollmentCall.filterByFormula).toBeUndefined();
    expect(enrollmentCall.maxRecords).toBeUndefined();
    expect(enrollmentCall.fields).toEqual(expect.arrayContaining([
      "Active?",
      "Athlete",
      "Athlete ID Lookup",
      "Program Instance",
      "Current Level",
      "Level Status",
    ]));
  });

  it("allows multiple retained Config years because Config is not consulted for public standings", async () => {
    installQueryMock([enrollment("recAxxxxxxx00001", "Avery")]);
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Config") {
        return {
          records: [
            { id: "recCfg1", fields: { "Active School Year": "2025-2026" } },
            { id: "recCfg2", fields: { "Active School Year": "2026-2027" } },
            { id: "recCfg3", fields: { "Active School Year": "2027-2028" } },
            { id: "recCfg4", fields: { "Active School Year": "2028-2029" } },
          ],
        };
      }
      if (params.tableName === "Program Instance - Sync") {
        return { records: [registeringProgramInstance()] };
      }
      if (params.tableName === "Levels") {
        return {
          records: [{
            id: FIXTURE_LEVEL_2_ID,
            fields: activeLevel2Fields(),
          }],
        };
      }
      if (params.tableName === "Enrollments") {
        return { records: [enrollment("recAxxxxxxx00001", "Avery")] };
      }
      throw new Error(`Unexpected table ${params.tableName}`);
    });

    await expect(fetchLeaderboard()).resolves.toMatchObject({
      entries: [{ displayName: "Avery" }],
    });
    expect(listAirtableRecordsMock.mock.calls.every(
      ([params]) => params.tableName !== "Config",
    )).toBe(true);
  });

  it("accepts enrollments scoped by live Program Instance record id after name validation", async () => {
    installQueryMock([
      enrollment("recCrNNAdVmQ4Y8fL", "Casey", {
        "Program Instance": [FIXTURE_PROGRAM_INSTANCE_ID],
        "Lifetime XP Total": 250,
      }),
    ]);

    const data = await fetchLeaderboard();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].displayName).toBe("Casey");
  });

  it("accepts enrollments with live Current Level record-id link, lookup rank array, and matching display name", async () => {
    installQueryMock([
      enrollment("recCrNNAdVmQ4Y8fL", "Casey", {
        "Current Level": [FIXTURE_LEVEL_2_ID],
        "Current Level - Public Facing Display": "Level 2",
        "Level Sort Order - For Softr": [2],
        "Lifetime XP Total": 250,
      }),
    ]);

    const data = await fetchLeaderboard();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].displayName).toBe("Casey");
    expect(data.entries[0].level).toBe("Level 2");
  });

  it("fails closed when zero or multiple Registering Shooting Challenge Program Instances exist", async () => {
    listAirtableRecordsMock.mockResolvedValue({ records: [] });
    await expect(fetchLeaderboard()).rejects.toThrow(
      /exactly one Registering Shooting Challenge Program Instance; found 0/,
    );

    listAirtableRecordsMock.mockResolvedValue({
      records: [
        registeringProgramInstance({ "School Year - Linked": FIXTURE_SCHOOL_YEAR }),
        {
          id: "recProgram2",
          fields: {
            "Name - Program Instance": "Shooting Challenge | 2027-2028",
            "School Year - Linked": "2027-2028",
            "Program - Linked": "Shooting Challenge",
            Status: "Registering",
          },
        },
      ],
    });
    await expect(fetchLeaderboard()).rejects.toThrow(
      /exactly one Registering Shooting Challenge Program Instance; found 2/,
    );
  });

  it("fails closed when School Year - Linked is missing or the Program Instance name is not canonical", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Program Instance - Sync") {
        return { records: [registeringProgramInstance({ "School Year - Linked": "" })] };
      }
      throw new Error(`Unexpected table ${params.tableName}`);
    });
    await expect(fetchLeaderboard()).rejects.toThrow(/missing School Year - Linked/);

    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Program Instance - Sync") {
        return {
          records: [registeringProgramInstance({
            "Name - Program Instance": "Shooting Challenge 2026-2027",
          })],
        };
      }
      throw new Error(`Unexpected table ${params.tableName}`);
    });
    await expect(fetchLeaderboard()).rejects.toThrow(
      /name must be exactly "Shooting Challenge \| 2026-2027"/,
    );
  });

  it("fails closed for an unavailable approved view instead of broadening to the Enrollments table", async () => {
    installQueryMock([]);
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Program Instance - Sync") {
        return { records: [registeringProgramInstance()] };
      }
      if (params.tableName === "Levels") {
        return {
          records: [{ id: FIXTURE_LEVEL_2_ID, fields: activeLevel2Fields() }],
        };
      }
      throw new AirtableApiError(422, JSON.stringify({ error: { type: "VIEW_NAME_NOT_FOUND" } }));
    });

    await expect(fetchLeaderboard()).rejects.toThrow(/VIEW_NAME_NOT_FOUND/);
    expect(listAirtableRecordsMock).toHaveBeenCalledTimes(3);
    expect(listAirtableRecordsMock.mock.calls[2][0].filterByFormula).toBeUndefined();
  });

  it("reflects upward and downward corrected values on the next revalidated adapter read", async () => {
    installQueryMock([
      enrollment("recAxxxxxxx00001", "Avery", { "Lifetime XP Total": 300 }),
      enrollment("recBxxxxxxx00002", "Blair", { "Lifetime XP Total": 200 }),
    ]);
    expect((await fetchLeaderboard()).entries.map((entry) => entry.displayName)).toEqual(["Avery", "Blair"]);

    installQueryMock([
      enrollment("recAxxxxxxx00001", "Avery", { "Lifetime XP Total": 100 }),
      enrollment("recBxxxxxxx00002", "Blair", { "Lifetime XP Total": 200 }),
    ]);
    expect((await fetchLeaderboard()).entries.map((entry) => entry.displayName)).toEqual(["Blair", "Avery"]);
  });

  it("publishes the higher-ranked enrollment when a duplicate identity appears in the view", async () => {
    installQueryMock([
      enrollment("recAxxxxxxx00001", "Avery", {
        "Athlete ID Lookup": ["same-athlete"],
        "Lifetime XP Total": 100,
      }),
      enrollment("recBxxxxxxx00002", "Blair", {
        "Athlete ID Lookup": ["same-athlete"],
        "Lifetime XP Total": 300,
      }),
    ]);
    const data = await fetchLeaderboard();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].displayName).toBe("Blair");
    expect(data.entries[0].xp).toBe(300);
  });

  it("skips a stale level after a downward XP correction instead of blanking the board", async () => {
    installQueryMock([enrollment("recAxxxxxxx00001", "Avery", { "Lifetime XP Total": 100 })]);
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Program Instance - Sync") {
        return { records: [registeringProgramInstance()] };
      }
      if (params.tableName === "Levels") {
        return {
          records: [{
            id: FIXTURE_LEVEL_2_ID,
            fields: activeLevel2Fields({ "XP Required (Cumulative)": 200 }),
          }],
        };
      }
      return { records: [enrollment("recAxxxxxxx00001", "Avery", { "Lifetime XP Total": 100 })] };
    });
    await expect(fetchLeaderboard()).resolves.toMatchObject({ entries: [] });
  });

  it("uses the canonical Registering Program Instance name when validating season selection", () => {
    expect(FIXTURE_PROGRAM_INSTANCE_NAME).toBe(`Shooting Challenge | ${FIXTURE_SCHOOL_YEAR}`);
  });
});
