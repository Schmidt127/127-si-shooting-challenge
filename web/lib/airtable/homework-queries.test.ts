import { beforeEach, describe, expect, it, vi } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import {
  fetchScheduledHomeworkAssignment,
  fetchScheduledHomeworkCatalog,
} from "@/lib/airtable/homework-queries";

const CURRENT_PI_ID = "rec5mEM0YPqPqq0hZ";
const HOMEWORK_ID = "rechVLOeyEVIqmy2v";
const WEEK_ID = "recWeVrSabnsYaHc2";
const SCHOOL_YEAR = "2026-2027";
const PROGRAM_INSTANCE = `Shooting Challenge | ${SCHOOL_YEAR}`;
const REGISTERING_FILTER =
  "AND({Program - Linked}='Shooting Challenge',{Status}='Registering')";

function registeringProgramInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: CURRENT_PI_ID,
    fields: {
      "Name - Program Instance": PROGRAM_INSTANCE,
      "School Year - Linked": SCHOOL_YEAR,
      "Program - Linked": "Shooting Challenge",
      Status: { name: "Registering" },
      "Record Id": CURRENT_PI_ID,
      ...overrides,
    },
  };
}

function installBaseMocks(phaRecords: Array<{ id: string; fields: Record<string, unknown> }>) {
  listAirtableRecordsMock.mockImplementation(async (params) => {
    if (params.tableName === "Program Instance - Synced") {
      return { records: [registeringProgramInstance()] } as never;
    }
    if (params.tableName === "Program Homework Assignments") return { records: phaRecords } as never;
    if (params.tableName === "Homework Library") {
      return {
        records: [{
          id: HOMEWORK_ID,
          fields: {
            "Assignment Full Name": "SA - Personal Game Plan - Shot Tracker Usage",
            "Assignment Full Name - Display": "Shot Tracker Usage",
            "Assignment Title": "Shot Tracker Usage",
            "Homework Number": "HW1",
            "Assignment Number": 1,
            Order: 1,
            "Published?": true,
          },
        }],
      } as never;
    }
    if (params.tableName === "Weeks") {
      return {
        records: [{
          id: WEEK_ID,
          fields: {
            "Week Name": "Early Bird - Testing",
            "Start Date": "2026-08-02T06:00:00.000Z",
          },
        }],
      } as never;
    }
    throw new Error(`Unexpected table ${params.tableName}`);
  });
}

function pha(
  id: string,
  weekId = WEEK_ID,
  gradeBandIds = [
    "recK7BDVSpHy2ipCS",
    "reclWDQZzKbVBtdhG",
    "recv9aWnHanY2sRgk",
    "rec2VQFfGJa1ofA06",
    "rec75ruo3XT5nSvaK",
  ],
) {
  return {
    id,
    fields: {
      "Homework Assignment": [{ id: HOMEWORK_ID }],
      "Program Instance": [{ id: CURRENT_PI_ID }],
      "Program Instance RID": [CURRENT_PI_ID],
      Week: [{ id: weekId }],
      "Grade Band": gradeBandIds.map((gradeBandId) => ({ id: gradeBandId })),
      "Homework Slot": { name: "HW1" },
      "Active?": true,
      "Schedule Key": `${CURRENT_PI_ID}|${weekId}|HW1|${HOMEWORK_ID}`,
    },
  };
}

describe("PHA-backed public homework scheduling", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  it("resolves the Registering Shooting Challenge Program Instance without reading Config", async () => {
    installBaseMocks([pha("rec00000000000001")]);
    const catalog = await fetchScheduledHomeworkCatalog();
    expect(catalog.totalAssignments).toBe(1);

    const programCall = listAirtableRecordsMock.mock.calls.find(
      ([params]) => params.tableName === "Program Instance - Synced",
    )?.[0];
    expect(programCall).toMatchObject({ filterByFormula: REGISTERING_FILTER });
    expect(listAirtableRecordsMock.mock.calls.every(
      ([params]) => params.tableName !== "Config",
    )).toBe(true);
  });

  it("allows multiple retained Config years because Config is not consulted for public homework", async () => {
    installBaseMocks([pha("rec00000000000001")]);
    listAirtableRecordsMock.mockImplementation(async (params) => {
      if (params.tableName === "Config") {
        return {
          records: [
            { id: "recCfg1", fields: { "Active School Year": "2025-2026" } },
            { id: "recCfg2", fields: { "Active School Year": "2026-2027" } },
            { id: "recCfg3", fields: { "Active School Year": "2027-2028" } },
            { id: "recCfg4", fields: { "Active School Year": "2028-2029" } },
          ],
        } as never;
      }
      if (params.tableName === "Program Instance - Synced") {
        return { records: [registeringProgramInstance()] } as never;
      }
      if (params.tableName === "Program Homework Assignments") {
        return { records: [pha("rec00000000000001")] } as never;
      }
      if (params.tableName === "Homework Library") {
        return {
          records: [{
            id: HOMEWORK_ID,
            fields: {
              "Assignment Full Name": "SA - Personal Game Plan - Shot Tracker Usage",
              "Assignment Full Name - Display": "Shot Tracker Usage",
              "Assignment Title": "Shot Tracker Usage",
              "Homework Number": "HW1",
              "Assignment Number": 1,
              Order: 1,
              "Published?": true,
            },
          }],
        } as never;
      }
      if (params.tableName === "Weeks") {
        return {
          records: [{
            id: WEEK_ID,
            fields: {
              "Week Name": "Early Bird - Testing",
              "Start Date": "2026-08-02T06:00:00.000Z",
            },
          }],
        } as never;
      }
      throw new Error(`Unexpected table ${params.tableName}`);
    });

    await expect(fetchScheduledHomeworkCatalog()).resolves.toMatchObject({ totalAssignments: 1 });
    expect(listAirtableRecordsMock.mock.calls.every(
      ([params]) => params.tableName !== "Config",
    )).toBe(true);
  });

  it("fails closed when zero or multiple Registering Shooting Challenge Program Instances exist", async () => {
    listAirtableRecordsMock.mockResolvedValue({ records: [] } as never);
    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(
      /exactly one Registering Shooting Challenge Program Instance; found 0/,
    );

    listAirtableRecordsMock.mockResolvedValue({
      records: [
        registeringProgramInstance(),
        {
          id: "recOtherPi",
          fields: {
            "Name - Program Instance": "Shooting Challenge | 2027-2028",
            "School Year - Linked": "2027-2028",
            "Program - Linked": "Shooting Challenge",
            Status: { name: "Registering" },
          },
        },
      ],
    } as never);
    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(
      /exactly one Registering Shooting Challenge Program Instance; found 2/,
    );
  });

  it("fails closed when School Year - Linked is missing or the Program Instance name is not canonical", async () => {
    listAirtableRecordsMock.mockImplementation(async (params) => {
      if (params.tableName === "Program Instance - Synced") {
        return { records: [registeringProgramInstance({ "School Year - Linked": "" })] } as never;
      }
      throw new Error(`Unexpected table ${params.tableName}`);
    });
    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(/missing School Year - Linked/);

    listAirtableRecordsMock.mockImplementation(async (params) => {
      if (params.tableName === "Program Instance - Synced") {
        return {
          records: [registeringProgramInstance({
            "Name - Program Instance": "Wrong Name",
          })],
        } as never;
      }
      throw new Error(`Unexpected table ${params.tableName}`);
    });
    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(
      /name must be exactly "Shooting Challenge \| 2026-2027"/,
    );
  });

  it("shows no curriculum items when there is no active PHA", async () => {
    installBaseMocks([]);
    const catalog = await fetchScheduledHomeworkCatalog();
    expect(catalog.totalAssignments).toBe(0);
    expect(catalog.weekGroups).toEqual([]);
  });

  it("shows one scheduled assignment even when PHA eligibility metadata lists every grade band", async () => {
    installBaseMocks([pha("rec00000000000001")]);
    const catalog = await fetchScheduledHomeworkCatalog();
    expect(catalog.totalAssignments).toBe(1);
    expect(catalog.weekGroups).toHaveLength(1);
    expect(catalog.weekGroups[0].weekId).toBe(WEEK_ID);
    expect(catalog.weekGroups[0].assignments).toHaveLength(1);
    expect(catalog.weekGroups[0].assignments[0].id).toBe(HOMEWORK_ID);
  });

  it("fails closed when duplicate active PHA rows exist for the same PI + Week + slot even if eligibility metadata differs", async () => {
    installBaseMocks([
      pha("rec00000000000002", WEEK_ID, ["reclWDQZzKbVBtdhG"]),
      pha("rec00000000000003", WEEK_ID, ["recK7BDVSpHy2ipCS"]),
    ]);
    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(/Multiple active PHA rows/);
  });

  it("fails closed when one homework is scheduled to multiple distinct Weeks on the public detail page", async () => {
    const otherWeekId = "rec2Rewxt21z7dI9f";
    installBaseMocks([
      pha("rec00000000000004", WEEK_ID),
      pha("rec00000000000005", otherWeekId),
    ]);
    await expect(fetchScheduledHomeworkAssignment(HOMEWORK_ID)).rejects.toThrow(/scheduled to 2 distinct Weeks/);
  });

  it("fails closed on an incomplete active PHA instead of falling back to Homework Library scheduling fields", async () => {
    installBaseMocks([{
      id: "rec00000000000006",
      fields: {
        "Homework Assignment": [{ id: HOMEWORK_ID }],
        "Program Instance": [{ id: CURRENT_PI_ID }],
        "Program Instance RID": [CURRENT_PI_ID],
        Week: [],
        "Grade Band": [{ id: "reclWDQZzKbVBtdhG" }],
        "Homework Slot": { name: "HW1" },
        "Active?": true,
      },
    }]);
    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(/incomplete/);
  });
});
