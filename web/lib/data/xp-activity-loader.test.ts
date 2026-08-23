import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AirtableApiError } from "@/lib/airtable/errors";
import {
  buildBrokenEnrollmentJoinFilter,
  buildEnrollmentRecordIdFilter,
  buildRecordIdOrFilter,
  chunkRecordIds,
  clearLinkedXpIdsCache,
  dedupeXpEventRecords,
  fetchLinkedXpEventIds,
  loadXpActivityForEnrollment,
  mapXpEventRecordToSummary,
  sortXpEventsNewestFirst,
  XpActivityLoadError,
  type XpEventRecordFields,
} from "@/lib/data/xp-activity-loader";

const listAirtableRecordsMock = vi.fn();

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: (...args: unknown[]) => listAirtableRecordsMock(...args),
}));

const ENR_WITH_XP = "recCyFEPeATOVNlr9";
const ENR_NO_XP = "recEmptyEnrollment1";
const ENR_SIMILAR_NAME_A = "recAthleteSmithA01";
const ENR_SIMILAR_NAME_B = "recAthleteSmithB02";

function xpRecord(
  id: string,
  fields: Partial<XpEventRecordFields>,
): { id: string; fields: XpEventRecordFields } {
  return {
    id,
    fields: {
      "Active?": true,
      "Active XP Points": 20,
      "XP Source": "Submission Base",
      "XP Reason Public": "Shooting submission completed.",
      "XP Activity Date": "2026-08-10",
      Created: "2026-08-10T12:00:00.000Z",
      "Source Key": `SUBMISSION_XP|${id}`,
      "Enrollment Record ID": [ENR_WITH_XP],
      ...fields,
    },
  };
}

describe("xp-activity-loader filters", () => {
  it("documents that ARRAYJOIN({Enrollment}) is not a record-id filter", () => {
    const broken = buildBrokenEnrollmentJoinFilter(ENR_WITH_XP);
    expect(broken).toBe(`FIND("${ENR_WITH_XP}", ARRAYJOIN({Enrollment}))`);
    expect(broken).not.toContain("Enrollment Record ID");
  });

  it("builds the authoritative Enrollment Record ID filter", () => {
    expect(buildEnrollmentRecordIdFilter(ENR_WITH_XP)).toBe(
      `{Enrollment Record ID}="${ENR_WITH_XP}"`,
    );
  });

  it("builds chunked RECORD_ID filters", () => {
    expect(buildRecordIdOrFilter(["recA", "recB"])).toBe(
      'OR(RECORD_ID()="recA",RECORD_ID()="recB")',
    );
    expect(chunkRecordIds(["rec1", "rec2", "rec3"], 2)).toEqual([["rec1", "rec2"], ["rec3"]]);
  });
});

describe("xp-activity-loader mapping", () => {
  it("sorts newest-to-oldest by activity date then record id", () => {
    const sorted = sortXpEventsNewestFirst([
      {
        id: "recOld",
        points: 10,
        activityDate: "2026-08-01",
      },
      {
        id: "recNew",
        points: 15,
        activityDate: "2026-08-10",
      },
      {
        id: "recMid",
        points: 12,
        activityDate: "2026-08-05",
      },
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["recNew", "recMid", "recOld"]);
  });

  it("dedupes duplicate source keys preferring active and newest created", () => {
    const deduped = dedupeXpEventRecords([
      xpRecord("recDupInactive", {
        "Active?": false,
        "Source Key": "HOMEWORK_XP|recHW1",
        Created: "2026-08-09T12:00:00.000Z",
      }),
      xpRecord("recDupActive", {
        "Active?": true,
        "Source Key": "HOMEWORK_XP|recHW1",
        Created: "2026-08-08T12:00:00.000Z",
      }),
      xpRecord("recUnique", {
        "Source Key": "SUBMISSION_XP|recSub1",
      }),
    ]);

    expect(deduped.map((row) => row.id)).toEqual(["recDupActive", "recUnique"]);
  });

  it("maps XP event records to summaries", () => {
    const summary = mapXpEventRecordToSummary(
      xpRecord("recMap1", {
        "XP Source": "Homework Completion",
        "XP Reason Public": "Homework marked satisfactory.",
      }),
    );

    expect(summary.sourceLabel).toBe("Homework Completion");
    expect(summary.reasonPublic).toBe("Homework marked satisfactory.");
    expect(summary.points).toBe(20);
    expect(summary.activityDate).toBe("2026-08-10");
  });
});

describe("loadXpActivityForEnrollment", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
    clearLinkedXpIdsCache();
  });

  afterEach(() => {
    clearLinkedXpIdsCache();
  });

  it("returns XP rows for an athlete with linked XP Events", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "XP Events") {
        return {
          records: [
            xpRecord("recXp1", {
              "XP Activity Date": "2026-08-08",
              "XP Source": "Homework Completion",
            }),
            xpRecord("recXp2", {
              "XP Activity Date": "2026-08-10",
              "XP Source": "Submission Base",
            }),
          ],
        };
      }
      if (params.tableName === "Enrollments") {
        return { records: [{ id: ENR_WITH_XP, fields: { "XP Events": ["recXp1", "recXp2"] } }] };
      }
      return { records: [] };
    });

    const result = await loadXpActivityForEnrollment(ENR_WITH_XP);

    expect(result.strategy).toBe("enrollment_record_id");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].id).toBe("recXp2");
    expect(result.rows[1].id).toBe("recXp1");
    expect(listAirtableRecordsMock.mock.calls[0][0].filterByFormula).toBe(
      buildEnrollmentRecordIdFilter(ENR_WITH_XP),
    );
  });

  it("returns an empty array for an athlete with no XP Events", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Enrollments") {
        return { records: [{ id: ENR_NO_XP, fields: { "XP Events": [] } }] };
      }
      return { records: [] };
    });

    const result = await loadXpActivityForEnrollment(ENR_NO_XP);

    expect(result.rows).toEqual([]);
    expect(result.warning).toBeUndefined();
  });

  it("scopes XP rows per enrollment even when athlete names are similar", async () => {
    listAirtableRecordsMock.mockImplementation(
      async (params: { tableName: string; filterByFormula?: string }) => {
        if (params.tableName === "XP Events") {
          if (params.filterByFormula === buildEnrollmentRecordIdFilter(ENR_SIMILAR_NAME_A)) {
            return {
              records: [
                xpRecord("recXpA", {
                  "Enrollment Record ID": [ENR_SIMILAR_NAME_A],
                  "XP Reason Public": "Smith, Alex",
                }),
              ],
            };
          }
          if (params.filterByFormula === buildEnrollmentRecordIdFilter(ENR_SIMILAR_NAME_B)) {
            return {
              records: [
                xpRecord("recXpB", {
                  "Enrollment Record ID": [ENR_SIMILAR_NAME_B],
                  "XP Reason Public": "Smith, Alexander",
                }),
              ],
            };
          }
          return { records: [] };
        }
        if (params.tableName === "Enrollments") {
          const id = params.filterByFormula?.includes(ENR_SIMILAR_NAME_A)
            ? ENR_SIMILAR_NAME_A
            : ENR_SIMILAR_NAME_B;
          return {
            records: [
              {
                id,
                fields: { "XP Events": id === ENR_SIMILAR_NAME_A ? ["recXpA"] : ["recXpB"] },
              },
            ],
          };
        }
        return { records: [] };
      },
    );

    const [resultA, resultB] = await Promise.all([
      loadXpActivityForEnrollment(ENR_SIMILAR_NAME_A),
      loadXpActivityForEnrollment(ENR_SIMILAR_NAME_B),
    ]);

    expect(resultA.rows).toHaveLength(1);
    expect(resultA.rows[0].id).toBe("recXpA");
    expect(resultB.rows).toHaveLength(1);
    expect(resultB.rows[0].id).toBe("recXpB");
    expect(resultA.rows[0].reasonPublic).not.toBe(resultB.rows[0].reasonPublic);
  });

  it("excludes inactive XP Events by default and dedupes duplicates", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "XP Events") {
        return {
          records: [
            xpRecord("recActive", {
              "Active?": true,
              "Source Key": "SUBMISSION_XP|recSubDup",
              "XP Activity Date": "2026-08-11",
            }),
            xpRecord("recInactive", {
              "Active?": false,
              "Source Key": "SUBMISSION_XP|recSubDup",
              "XP Activity Date": "2026-08-12",
            }),
            xpRecord("recOtherInactive", {
              "Active?": false,
              "Source Key": "HOMEWORK_XP|recHW2",
            }),
          ],
        };
      }
      if (params.tableName === "Enrollments") {
        return {
          records: [
            {
              id: ENR_WITH_XP,
              fields: { "XP Events": ["recActive", "recInactive", "recOtherInactive"] },
            },
          ],
        };
      }
      return { records: [] };
    });

    const result = await loadXpActivityForEnrollment(ENR_WITH_XP);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe("recActive");
  });

  it("falls back to linked XP Event IDs when the enrollment filter returns no rows", async () => {
    listAirtableRecordsMock.mockImplementation(
      async (params: { tableName: string; filterByFormula?: string }) => {
        if (params.tableName === "XP Events") {
          if (params.filterByFormula === buildEnrollmentRecordIdFilter(ENR_WITH_XP)) {
            return { records: [] };
          }
          if (params.filterByFormula === 'RECORD_ID()="recXpFallback"') {
            return {
              records: [
                xpRecord("recXpFallback", {
                  "XP Activity Date": "2026-08-07",
                  "XP Source": "Shot Milestone",
                }),
              ],
            };
          }
        }
        if (params.tableName === "Enrollments") {
          return {
            records: [{ id: ENR_WITH_XP, fields: { "XP Events": ["recXpFallback"] } }],
          };
        }
        return { records: [] };
      },
    );

    const result = await loadXpActivityForEnrollment(ENR_WITH_XP);

    expect(result.strategy).toBe("linked_ids_fallback");
    expect(result.warning).toContain("linked-record fallback");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe("recXpFallback");
  });

  it("throws instead of silently returning empty when linked XP Events cannot be loaded", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Enrollments") {
        return {
          records: [{ id: ENR_WITH_XP, fields: { "XP Events": ["recMissing1", "recMissing2"] } }],
        };
      }
      return { records: [] };
    });

    await expect(loadXpActivityForEnrollment(ENR_WITH_XP)).rejects.toBeInstanceOf(
      XpActivityLoadError,
    );
  });

  it("rejects invalid enrollment ids", async () => {
    await expect(loadXpActivityForEnrollment("not-a-record")).rejects.toThrow(
      /Invalid enrollment record id/,
    );
  });

  it("uses linked-id fallback when Enrollment Record ID field is unavailable", async () => {
    listAirtableRecordsMock.mockImplementation(
      async (params: { tableName: string; filterByFormula?: string }) => {
        if (params.tableName === "XP Events") {
          if (!params.filterByFormula || params.filterByFormula.includes("Enrollment Record ID")) {
            throw new AirtableApiError(422, "UNKNOWN_FIELD_NAME Enrollment Record ID");
          }
          if (params.filterByFormula === 'RECORD_ID()="recXpFieldFallback"') {
            return {
              records: [xpRecord("recXpFieldFallback", { "XP Source": "Perfect Week" })],
            };
          }
        }
        if (params.tableName === "Enrollments") {
          return {
            records: [{ id: ENR_WITH_XP, fields: { "XP Events": ["recXpFieldFallback"] } }],
          };
        }
        return { records: [] };
      },
    );

    const result = await loadXpActivityForEnrollment(ENR_WITH_XP);

    expect(result.strategy).toBe("linked_ids_fallback");
    expect(result.warning).toContain("Enrollment Record ID is unavailable");
    expect(result.rows[0].sourceLabel).toBe("Perfect Week");
  });
});

describe("fetchLinkedXpEventIds cache", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
    clearLinkedXpIdsCache();
  });

  it("caches enrollment linked XP ids within the TTL", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [{ id: ENR_WITH_XP, fields: { "XP Events": ["recCache1"] } }],
    });

    const first = await fetchLinkedXpEventIds(ENR_WITH_XP);
    const second = await fetchLinkedXpEventIds(ENR_WITH_XP);

    expect(first).toEqual(["recCache1"]);
    expect(second).toEqual(["recCache1"]);
    expect(listAirtableRecordsMock).toHaveBeenCalledTimes(1);
  });
});
