import { beforeEach, describe, expect, it, vi } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import { fetchLeaderboard } from "@/lib/airtable/queries";
import { AirtableApiError } from "@/lib/airtable/errors";

const SCHOOL_YEAR = "2026-2027";
const PROGRAM_INSTANCE = `Shooting Challenge | ${SCHOOL_YEAR}`;

function enrollment(
  id: string,
  athlete: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    fields: {
      "Active?": true,
      Athlete: [{ name: athlete }],
      "Athlete ID Lookup": [`athlete-${id}`],
      "Program Instance": [{ name: PROGRAM_INSTANCE }],
      "Full Athlete Name": athlete,
      "Current Level": [{ name: "Level 2" }],
      "Current Level - Public Facing Display": "Level 2",
      "Level Sort Order - For Softr": 2,
      "Level Status": "Assigned",
      "Lifetime XP Total": 100,
      "Total Shots Counted": 50,
      "School Year": SCHOOL_YEAR,
      ...overrides,
    },
  };
}

function installQueryMock(records: ReturnType<typeof enrollment>[]) {
  listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
    if (params.tableName === "Config") {
      return { records: [{ id: "recConfig", fields: { "Active School Year": SCHOOL_YEAR } }] };
    }
    if (params.tableName === "Program Instance - Synced") {
      return {
        records: [{
          id: "recProgram",
          fields: {
            "Name - Program Instance": PROGRAM_INSTANCE,
            "School Year - Linked": SCHOOL_YEAR,
            "Record Id": "recProgram",
          },
        }],
      };
    }
    if (params.tableName === "Levels") {
      return {
        records: [{
          id: "recLevel2",
          fields: { "Level Name": "Level 2", "Sort Order": 2, "Active?": true },
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

  it("executes the scoped config → Program Instance → approved-view read and returns only public model fields", async () => {
    installQueryMock([
      enrollment("recA", "Avery", { "Lifetime XP Total": 200 }),
      enrollment("recB", "Blair", { "Lifetime XP Total": 300 }),
    ]);

    const data = await fetchLeaderboard();

    expect(data.entries.map((entry) => entry.displayName)).toEqual(["Blair", "Avery"]);
    expect(data.entries.every((entry) => !("id" in entry))).toBe(true);
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

  it("fails closed for an unavailable approved view instead of broadening to the Enrollments table", async () => {
    installQueryMock([]);
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Config") {
        return { records: [{ id: "recConfig", fields: { "Active School Year": SCHOOL_YEAR } }] };
      }
      if (params.tableName === "Program Instance - Synced") {
        return { records: [{ id: "recProgram", fields: { "Name - Program Instance": PROGRAM_INSTANCE } }] };
      }
      if (params.tableName === "Levels") {
        return { records: [{ id: "recLevel2", fields: { "Level Name": "Level 2", "Sort Order": 2, "Active?": true } }] };
      }
      throw new AirtableApiError(422, JSON.stringify({ error: { type: "VIEW_NAME_NOT_FOUND" } }));
    });

    await expect(fetchLeaderboard()).rejects.toThrow(/VIEW_NAME_NOT_FOUND/);
    expect(listAirtableRecordsMock).toHaveBeenCalledTimes(4);
    expect(listAirtableRecordsMock.mock.calls[3][0].filterByFormula).toBeUndefined();
  });

  it("reflects upward and downward corrected values on the next revalidated adapter read", async () => {
    installQueryMock([
      enrollment("recA", "Avery", { "Lifetime XP Total": 300 }),
      enrollment("recB", "Blair", { "Lifetime XP Total": 200 }),
    ]);
    expect((await fetchLeaderboard()).entries.map((entry) => entry.displayName)).toEqual(["Avery", "Blair"]);

    installQueryMock([
      enrollment("recA", "Avery", { "Lifetime XP Total": 100 }),
      enrollment("recB", "Blair", { "Lifetime XP Total": 200 }),
    ]);
    expect((await fetchLeaderboard()).entries.map((entry) => entry.displayName)).toEqual(["Blair", "Avery"]);
  });

  it("rejects a duplicate canonical enrollment identity returned by the view", async () => {
    installQueryMock([
      enrollment("recA", "Avery", { "Athlete ID Lookup": ["same-athlete"] }),
      enrollment("recB", "Avery", { "Athlete ID Lookup": ["same-athlete"] }),
    ]);
    await expect(fetchLeaderboard()).rejects.toThrow(/Duplicate canonical Enrollment identity/);
  });
});
