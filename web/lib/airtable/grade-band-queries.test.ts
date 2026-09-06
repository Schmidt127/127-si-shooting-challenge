import { beforeEach, describe, expect, it, vi } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import { fetchActiveGradeBandOptions } from "@/lib/airtable/grade-band-queries";
import { ALL_GRADE_BANDS_ID, ALL_GRADE_BANDS_LABEL } from "@/lib/data/grade-bands";

describe("fetchActiveGradeBandOptions", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  it("returns All plus active bands sorted by Sort Order", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        {
          id: "rec2",
          fields: {
            "Grade Band Name": "3-4",
            "Active?": true,
            "Sort Order": 2,
            "Min Grade": 3,
            "Max Grade": 4,
          },
        },
        {
          id: "rec1",
          fields: {
            "Grade Band Name": "K-2",
            "Active?": true,
            "Sort Order": 1,
            "Min Grade": -1,
            "Max Grade": 2,
          },
        },
      ],
    });

    const options = await fetchActiveGradeBandOptions();
    expect(options.map((o) => o.id)).toEqual(["all", "k-2", "3-4"]);
    expect(listAirtableRecordsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "Grade Bands",
        filterByFormula: "{Active?} = 1",
        sort: [{ field: "Sort Order", direction: "asc" }],
      }),
    );
  });

  it("falls back to All Grade Bands when the API fails", async () => {
    listAirtableRecordsMock.mockRejectedValue(new Error("network"));
    await expect(fetchActiveGradeBandOptions()).resolves.toEqual([
      expect.objectContaining({ id: ALL_GRADE_BANDS_ID, label: ALL_GRADE_BANDS_LABEL }),
    ]);
  });

  it("falls back to All when Airtable returns no usable rows", async () => {
    listAirtableRecordsMock.mockResolvedValue({ records: [] });
    await expect(fetchActiveGradeBandOptions()).resolves.toEqual([
      expect.objectContaining({ id: ALL_GRADE_BANDS_ID }),
    ]);
  });
});
