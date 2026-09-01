import { describe, expect, it, vi, beforeEach } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import { loadActivePhaSchedule } from "@/lib/airtable/pha-repository";

const PROGRAM_INSTANCE = {
  id: "rec5mEM0YPqPqq0hZ",
  name: "Shooting Challenge | 2026-2027",
  schoolYear: "2026-2027",
  scheduledPhaIds: ["recrpWRmt0MntieCL", "rechCXdubiA1RPFEj"],
};

describe("loadActivePhaSchedule", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  it("resolves duplicate Early Bird slots using Program Instance PHA link order", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        {
          id: "recrpWRmt0MntieCL",
          fields: {
            "Homework Assignment": [{ id: "rechVLOeyEVIqmy2v" }],
            "Program Instance": [{ id: PROGRAM_INSTANCE.id }],
            Week: [{ id: "recBrZ1sV8byWEHZU" }],
            "Homework Slot": { name: "HW1" },
            "Active?": true,
            "Completions Count": 1,
          },
        },
        {
          id: "rechCXdubiA1RPFEj",
          fields: {
            "Homework Assignment": [{ id: "recRZhsAtY9A6rDIu" }],
            "Program Instance": [{ id: PROGRAM_INSTANCE.id }],
            Week: [{ id: "recBrZ1sV8byWEHZU" }],
            "Homework Slot": { name: "HW1" },
            "Active?": true,
            "Completions Count": 1,
          },
        },
      ],
    } as never);

    const result = await loadActivePhaSchedule({
      programInstance: PROGRAM_INSTANCE,
      revalidateSeconds: 0,
      correlationId: "test-corr",
    });

    expect(result.parseResult.rows).toHaveLength(1);
    expect(result.parseResult.rows[0].phaId).toBe("recrpWRmt0MntieCL");
    expect(result.parseResult.resolvedDuplicateSlotKeys).toHaveLength(1);
  });
});
