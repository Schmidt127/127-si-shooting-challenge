import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: vi.fn(),
}));

import { listAirtableRecords } from "@/lib/airtable/client";
import {
  fetchScheduledHomeworkAssignment,
  fetchScheduledHomeworkCatalog,
} from "@/lib/airtable/homework-queries";

const mockedList = vi.mocked(listAirtableRecords);

const CURRENT_PI_ID = "rec5mEM0YPqPqq0hZ";
const HOMEWORK_ID = "rechVLOeyEVIqmy2v";
const WEEK_ID = "recWeVrSabnsYaHc2";

function installBaseMocks(phaRecords: Array<{ id: string; fields: Record<string, unknown> }>) {
  mockedList.mockImplementation(async (params) => {
    if (params.tableName === "Config") {
      return {
        records: [{ id: "rechc1f9f4kVM1tHP", fields: { "Active School Year": "2026-2027" } }],
      } as never;
    }

    if (params.tableName === "Program Instance - Synced") {
      return {
        records: [
          {
            id: CURRENT_PI_ID,
            fields: {
              "Name - Program Instance": "Shooting Challenge | 2026-2027",
              "School Year - Linked": "2026-2027",
              Status: { name: "Registering" },
              "Record Id": CURRENT_PI_ID,
            },
          },
        ],
      } as never;
    }

    if (params.tableName === "Program Homework Assignments") {
      return { records: phaRecords } as never;
    }

    if (params.tableName === "FBC Curriculum - SYNC") {
      return {
        records: [
          {
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
          },
        ],
      } as never;
    }

    if (params.tableName === "Weeks") {
      return {
        records: [
          {
            id: WEEK_ID,
            fields: {
              "Week Name": "Early Bird - Testing",
              "Start Date": "2026-08-02T06:00:00.000Z",
            },
          },
        ],
      } as never;
    }

    throw new Error(`Unexpected table ${params.tableName}`);
  });
}

function pha(id: string, weekId = WEEK_ID, gradeBandId = "reclWDQZzKbVBtdhG") {
  return {
    id,
    fields: {
      "Homework Assignment": [{ id: HOMEWORK_ID }],
      "Program Instance": [{ id: CURRENT_PI_ID }],
      "Program Instance RID": [CURRENT_PI_ID],
      Week: [{ id: weekId }],
      "Grade Band": [{ id: gradeBandId }],
      "Homework Slot": { name: "HW1" },
      "Active?": true,
      "Schedule Key": `${CURRENT_PI_ID}|${weekId}|${gradeBandId}|HW1|${HOMEWORK_ID}`,
    },
  };
}

describe("PHA-backed public homework scheduling", () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it("shows no curriculum items when there is no active PHA", async () => {
    installBaseMocks([]);

    const catalog = await fetchScheduledHomeworkCatalog();

    expect(catalog.totalAssignments).toBe(0);
    expect(catalog.weekGroups).toEqual([]);
  });

  it("collapses equivalent grade-band PHA rows into one public Homework+Week card", async () => {
    installBaseMocks([
      pha("rec00000000000001", WEEK_ID, "recK7BDVSpHy2ipCS"),
      pha("rec00000000000002", WEEK_ID, "reclWDQZzKbVBtdhG"),
      pha("rec00000000000003", WEEK_ID, "recv9aWnHanY2sRgk"),
      pha("rec00000000000004", WEEK_ID, "rec2VQFfGJa1ofA06"),
      pha("rec00000000000005", WEEK_ID, "rec75ruo3XT5nSvaK"),
    ]);

    const catalog = await fetchScheduledHomeworkCatalog();

    expect(catalog.totalAssignments).toBe(1);
    expect(catalog.weekGroups).toHaveLength(1);
    expect(catalog.weekGroups[0].weekId).toBe(WEEK_ID);
    expect(catalog.weekGroups[0].assignments).toHaveLength(1);
    expect(catalog.weekGroups[0].assignments[0].id).toBe(HOMEWORK_ID);
  });

  it("fails closed when one homework is scheduled to multiple distinct Weeks on the grade-agnostic detail page", async () => {
    const otherWeekId = "rec2Rewxt21z7dI9f";
    installBaseMocks([
      pha("rec00000000000006", WEEK_ID),
      pha("rec00000000000007", otherWeekId, "recK7BDVSpHy2ipCS"),
    ]);

    await expect(fetchScheduledHomeworkAssignment(HOMEWORK_ID)).rejects.toThrow(
      /scheduled to 2 distinct Weeks/,
    );
  });

  it("fails closed on an incomplete active PHA instead of falling back to curriculum Week", async () => {
    installBaseMocks([
      {
        id: "rec00000000000008",
        fields: {
          "Homework Assignment": [{ id: HOMEWORK_ID }],
          "Program Instance": [{ id: CURRENT_PI_ID }],
          "Program Instance RID": [CURRENT_PI_ID],
          Week: [],
          "Grade Band": [{ id: "reclWDQZzKbVBtdhG" }],
          "Homework Slot": { name: "HW1" },
          "Active?": true,
        },
      },
    ]);

    await expect(fetchScheduledHomeworkCatalog()).rejects.toThrow(/incomplete/);
  });
});
