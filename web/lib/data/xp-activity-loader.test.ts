import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AirtableApiError } from "@/lib/airtable/errors";
import { toAirtableDateKey } from "@/lib/data/airtable-values";
import {
  buildBrokenEnrollmentJoinFilter,
  buildEnrollmentRecordIdFilter,
  buildRecordIdOrFilter,
  buildXpActivityReconciliation,
  buildXpEventPresentationContext,
  chunkRecordIds,
  clearLinkedXpIdsCache,
  dedupeXpEventRecords,
  fetchLinkedXpEventIds,
  loadXpActivityForEnrollment,
  mapXpEventRecordToSummary,
  resolveXpEventDisplayDate,
  sortXpEventsNewestFirst,
  submissionExpectsXp,
  XpActivityLoadError,
  type SubmissionRecordFields,
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
const ENR_SCHMIDT_PREVIEW = "rec93mAfo5jKqP3g5";

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

function submissionRecord(
  id: string,
  fields: Partial<SubmissionRecordFields> = {},
): { id: string; fields: SubmissionRecordFields } {
  return {
    id,
    fields: {
      "Activity Date": "2026-08-22T00:00:00.000Z",
      Created: "2026-08-22T12:00:00.000Z",
      "Count This Submission?": true,
      "Total Shots Counted": 100,
      "XP Events": [],
      ...fields,
    },
  };
}

describe("toAirtableDateKey (Denver + midnight UTC)", () => {
  it("keeps date-only YYYY-MM-DD strings", () => {
    expect(toAirtableDateKey("2026-08-22")).toBe("2026-08-22");
  });

  it("keeps midnight UTC calendar day for Airtable date-only storage", () => {
    expect(toAirtableDateKey("2026-08-22T00:00:00.000Z")).toBe("2026-08-22");
  });

  it("does not shift 8/22 to 8/23 when UTC prefix would disagree with Denver", () => {
    // 2026-08-23T05:59:00Z = 2026-08-22 23:59 America/Denver (MDT)
    expect(toAirtableDateKey("2026-08-23T05:59:00.000Z")).toBe("2026-08-22");
  });

  it("maps Denver midnight instants to the local calendar day", () => {
    expect(toAirtableDateKey("2026-08-22T06:00:00.000Z")).toBe("2026-08-22");
  });
});

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
  it("sorts newest-to-oldest by activity date then source rank", () => {
    const sorted = sortXpEventsNewestFirst([
      {
        id: "recMilestone",
        points: 10,
        sourceLabel: "Shot Milestone",
        activityDate: "2026-08-22",
      },
      {
        id: "recSub",
        points: 20,
        sourceLabel: "Submission Base",
        activityDate: "2026-08-22",
      },
      {
        id: "recOld",
        points: 10,
        activityDate: "2026-08-01",
      },
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["recMilestone", "recSub", "recOld"]);
  });

  it("dedupes duplicate source keys preferring active and newest created", () => {
    const { kept } = dedupeXpEventRecords([
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

    expect(kept.map((row) => row.id)).toEqual(["recDupActive", "recUnique"]);
  });

  it("uses Submission Activity Date for Submission Base rows", () => {
    const summary = mapXpEventRecordToSummary(
      xpRecord("recMap1", {
        "XP Source": "Submission Base",
        "XP Activity Date": "2026-08-23T05:59:00.000Z",
      }),
      "2026-08-22T00:00:00.000Z",
      { submissionTotalShots: 250 },
    );

    expect(summary.activityDate).toBe("2026-08-22");
    expect(summary.submissionTotalShots).toBe(250);
  });

  it("prefers XP Activity Date over Created for non-submission sources", () => {
    const resolved = resolveXpEventDisplayDate({
      "XP Source": "Homework Completion",
      "XP Activity Date": "2026-08-20T06:00:00.000Z",
      Created: "2026-08-21T14:59:48.000Z",
    });
    expect(resolved.displayedDate).toBe("2026-08-20");
    expect(resolved.usedCreatedFallback).toBe(false);
  });
});

describe("Schmidt preview regression fixtures", () => {
  const aug22SubIds = [
    "recvtQh5Rq6yTFotc",
    "recqYLtep74I0tvDF",
    "recoin44RERFMChHg",
    "rec0Yu4js37Xk5dHX",
  ];

  it("submissionExpectsXp follows Count This Submission?", () => {
    expect(submissionExpectsXp({ "Count This Submission?": true })).toBe(true);
    expect(submissionExpectsXp({ "Count This Submission?": false })).toBe(false);
  });

  it("reports missing XP Event for counted submissions", () => {
    const missingId = "recMissingSub01";
    const reconciliation = buildXpActivityReconciliation(
      [
        submissionRecord(missingId, {
          "Activity Date": "2026-08-22T00:00:00.000Z",
          "XP Events": [],
        }),
      ],
      [],
      ENR_SCHMIDT_PREVIEW,
      [],
    );

    expect(reconciliation).toEqual([
      expect.objectContaining({
        expectedSubmissionId: missingId,
        xpEventExists: false,
        exclusionReason: "missing_xp_event",
        submissionActivityDate: "2026-08-22",
      }),
    ]);
  });

  it("marks inactive and duplicate-remove XP Events as excluded", () => {
    const subId = "recSubInactive01";
    const reconciliation = buildXpActivityReconciliation(
      [submissionRecord(subId, { "XP Events": ["recInactiveXp"] })],
      [
        xpRecord("recInactiveXp", {
          "Active?": false,
          "Enrollment Record ID": [ENR_SCHMIDT_PREVIEW],
          "Source Key": `SUBMISSION_XP|${subId}`,
          Submission: [subId],
        }),
        xpRecord("recDupRemove", {
          "Enrollment Record ID": [ENR_SCHMIDT_PREVIEW],
          "Duplicate Status": "Duplicate - Remove",
          "Source Key": "SUBMISSION_XP|recOther",
          Submission: ["recOther"],
        }),
      ],
      ENR_SCHMIDT_PREVIEW,
      [],
    );

    expect(reconciliation.find((row) => row.xpEventId === "recInactiveXp")).toMatchObject({
      excluded: true,
      exclusionReason: "inactive",
    });
  });

  it("renders all four 8/22 submission fixtures with submission activity dates", () => {
    const submissions = aug22SubIds.map((id) =>
      submissionRecord(id, {
        "Activity Date": "2026-08-22T00:00:00.000Z",
        "XP Events": [`recXpFor${id}`],
      }),
    );
    const xpEvents = aug22SubIds.map((id) =>
      xpRecord(`recXpFor${id}`, {
        "Enrollment Record ID": [ENR_SCHMIDT_PREVIEW],
        "XP Activity Date": "2026-08-23T05:59:00.000Z",
        "Source Key": `SUBMISSION_XP|${id}`,
        Submission: [id],
      }),
    );

    const summaries = xpEvents.map((record) => {
      const sub = submissions.find((s) => s.id === record.fields.Submission?.[0]);
      return mapXpEventRecordToSummary(record, sub?.fields["Activity Date"]);
    });

    expect(summaries.every((row) => row.activityDate === "2026-08-22")).toBe(true);
  });

  it("supports multiple submissions on the same date", () => {
    const summaries = sortXpEventsNewestFirst(
      aug22SubIds.map((id) =>
        mapXpEventRecordToSummary(
          xpRecord(`recXpFor${id}`, {
            Submission: [id],
            "Source Key": `SUBMISSION_XP|${id}`,
          }),
          "2026-08-22T00:00:00.000Z",
        ),
      ),
    );

    expect(summaries).toHaveLength(4);
    expect(new Set(summaries.map((row) => row.activityDate))).toEqual(new Set(["2026-08-22"]));
  });

  it("orders later accomplishments before submission on the same date", () => {
    const sorted = sortXpEventsNewestFirst([
      {
        id: "recMilestone",
        points: 15,
        sourceLabel: "Shot Milestone",
        activityDate: "2026-08-22",
      },
      {
        id: "recSubmission",
        points: 20,
        sourceLabel: "Submission Base",
        activityDate: "2026-08-22",
      },
    ]);

    expect(sorted[0].id).toBe("recMilestone");
    expect(sorted[1].id).toBe("recSubmission");
  });

  it("handles backdated submission activity dates", () => {
    const summary = mapXpEventRecordToSummary(
      xpRecord("recBackdatedXp", {
        "XP Activity Date": "2026-08-22T12:00:00.000Z",
        Submission: ["recBackdatedSub"],
      }),
      "2026-08-17T06:00:00.000Z",
    );

    expect(summary.activityDate).toBe("2026-08-17");
  });
});

describe("buildXpEventPresentationContext", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  it("resolves submission shots, homework assignment title, and video filename", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Homework Completions") {
        return {
          records: [
            {
              id: "recHc1",
              fields: { "Program Homework Assignment": ["recPha1"] },
            },
          ],
        };
      }
      if (params.tableName === "Program Homework Assignments") {
        return {
          records: [
            {
              id: "recPha1",
              fields: {
                "Homework Assignment": ["recLib1"],
                "Assignment Title": ["Mikan Drill"],
              },
            },
          ],
        };
      }
      if (params.tableName === "Homework Library") {
        return {
          records: [{ id: "recLib1", fields: { "Assignment Title": "Mikan Drill" } }],
        };
      }
      if (params.tableName === "Video Feedback") {
        return {
          records: [
            {
              id: "recVf1",
              fields: { "Custom Video File Name": "FreeThrows.mov" },
            },
          ],
        };
      }
      return { records: [] };
    });

    const submissionById = new Map<string, { id: string; fields: SubmissionRecordFields }>([
      [
        "recSub1",
        {
          id: "recSub1",
          fields: { "Total Shots Counted": 1250 },
        },
      ],
    ]);

    const context = await buildXpEventPresentationContext(
      [
        xpRecord("recXpRich", {
          Submission: ["recSub1"],
          "Homework Completion": ["recHc1"],
          "Video Feedback": ["recVf1"],
        }),
      ],
      submissionById,
    );

    expect(context.get("recXpRich")).toEqual({
      submissionTotalShots: 1250,
      homeworkAssignmentTitle: "Mikan Drill",
      videoCustomFileName: "FreeThrows.mov",
    });
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
        return {
          records: [
            {
              id: ENR_WITH_XP,
              fields: { "XP Events": ["recXp1", "recXp2"], Submissions: [] },
            },
          ],
        };
      }
      return { records: [] };
    });

    const result = await loadXpActivityForEnrollment(ENR_WITH_XP);

    expect(result.strategy).toBe("enrollment_record_id");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].id).toBe("recXp2");
    expect(result.rows[1].id).toBe("recXp1");
    expect(result.reconciliation).toEqual([]);
    const xpCall = listAirtableRecordsMock.mock.calls.find(
      (call) => call[0].tableName === "XP Events",
    );
    expect(xpCall?.[0].filterByFormula).toBe(buildEnrollmentRecordIdFilter(ENR_WITH_XP));
  });

  it("returns an empty array for an athlete with no XP Events", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Enrollments") {
        return { records: [{ id: ENR_NO_XP, fields: { "XP Events": [], Submissions: [] } }] };
      }
      return { records: [] };
    });

    const result = await loadXpActivityForEnrollment(ENR_NO_XP);

    expect(result.rows).toEqual([]);
    expect(result.warning).toBeUndefined();
    expect(result.missingXpSubmissionIds).toEqual([]);
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
                fields: {
                  "XP Events": id === ENR_SIMILAR_NAME_A ? ["recXpA"] : ["recXpB"],
                  Submissions: [],
                },
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
              fields: {
                "XP Events": ["recActive", "recInactive", "recOtherInactive"],
                Submissions: [],
              },
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
            records: [
              {
                id: ENR_WITH_XP,
                fields: { "XP Events": ["recXpFallback"], Submissions: [] },
              },
            ],
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
          records: [
            {
              id: ENR_WITH_XP,
              fields: { "XP Events": ["recMissing1", "recMissing2"], Submissions: [] },
            },
          ],
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
            records: [
              {
                id: ENR_WITH_XP,
                fields: { "XP Events": ["recXpFieldFallback"], Submissions: [] },
              },
            ],
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

  it("warns when counted submissions are missing XP Events", async () => {
    const missingSub = "recMissingCountedSub";
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "XP Events") {
        return { records: [] };
      }
      if (params.tableName === "Enrollments") {
        return {
          records: [
            {
              id: ENR_WITH_XP,
              fields: { "XP Events": [], Submissions: [missingSub] },
            },
          ],
        };
      }
      if (params.tableName === "Submissions") {
        return {
          records: [
            {
              id: missingSub,
              fields: {
                "Activity Date": "2026-08-22T00:00:00.000Z",
                "Count This Submission?": true,
                "XP Events": [],
              },
            },
          ],
        };
      }
      return { records: [] };
    });

    const result = await loadXpActivityForEnrollment(ENR_WITH_XP);

    expect(result.missingXpSubmissionIds).toEqual([missingSub]);
    expect(result.warning).toContain("no XP Event");
  });
});

describe("fetchLinkedXpEventIds cache", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
    clearLinkedXpIdsCache();
  });

  it("caches enrollment linked XP ids within the TTL", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        {
          id: ENR_WITH_XP,
          fields: { "XP Events": ["recCache1"], Submissions: [] },
        },
      ],
    });

    const first = await fetchLinkedXpEventIds(ENR_WITH_XP);
    const second = await fetchLinkedXpEventIds(ENR_WITH_XP);

    expect(first).toEqual(["recCache1"]);
    expect(second).toEqual(["recCache1"]);
    expect(listAirtableRecordsMock).toHaveBeenCalledTimes(1);
  });
});
