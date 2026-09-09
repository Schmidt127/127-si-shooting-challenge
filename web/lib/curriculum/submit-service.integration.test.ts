import { beforeEach, describe, expect, it, vi } from "vitest";

import { PHA_AIRTABLE_FIELDS } from "@/lib/airtable/pha-field-map";
import type { CurriculumSubmitAuthorization } from "@/lib/curriculum/submit-auth";
import { processCurriculumHomeworkSubmit } from "@/lib/curriculum/submit-service";
import type { CurriculumSubmitPayload } from "@/lib/curriculum/submit-validation";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());
const createAirtableRecordMock = vi.hoisted(() => vi.fn());
const createAirtableRecordsMock = vi.hoisted(() => vi.fn());
const updateAirtableRecordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
  createAirtableRecord: createAirtableRecordMock,
  createAirtableRecords: createAirtableRecordsMock,
  updateAirtableRecord: updateAirtableRecordMock,
}));

vi.mock("@/lib/curriculum/upload-staging-service", () => ({
  bindCurriculumSubmitAssets: vi.fn(async () => []),
}));

const ENROLLMENT = "recEnroll00000001";
const OTHER_ENROLLMENT = "recEnrollOTHER0001";
const LIBRARY = "recLibraryCrow0001";
const PHA = "recPha00000000001";
const WEEK = "recWeek0000000001";
const GRADE_BAND = "recv9aWnHanY2sRgk";

const submitAuth: CurriculumSubmitAuthorization = {
  enrollmentId: ENROLLMENT,
  gradeBand: "5-6",
  assignmentKey: "AESOP_CROW_PITCHER",
  createdAt: 1,
  expiresAt: 9_999_999_999,
};

const basePayload: CurriculumSubmitPayload = {
  enrollmentId: ENROLLMENT,
  assignmentKey: "AESOP_CROW_PITCHER",
  curriculumVersion: 1,
  gradeBand: "5-6",
  attemptNumber: 1,
  parentAttemptNumber: null,
  submittedAt: "2026-09-07T12:00:00.000Z",
  answers: [
    {
      questionKey: "AESOP_CROW_PITCHER.5-6.Q01",
      questionOrder: 1,
      responseType: "short_answer",
      promptSnapshot: "Question?",
      value: "Answer",
    },
  ],
};

function enrollmentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ENROLLMENT,
    fields: {
      "Active?": true,
      "Program Instance": [{ id: "recProgramInst0001" }],
      "Grade Band": [{ id: GRADE_BAND }],
      "Homework Completions": [],
      ...overrides,
    },
  };
}

function installHappyPathMocks() {
  listAirtableRecordsMock.mockImplementation(async (params: { tableName: string; filterByFormula?: string }) => {
    if (params.tableName === "Enrollments") {
      return { records: [enrollmentRecord()] };
    }
    if (params.tableName === "Grade Bands") {
      return { records: [{ id: GRADE_BAND, fields: { "Grade Band Name": "5-6" } }] };
    }
    if (params.tableName === "Homework Library") {
      return { records: [{ id: LIBRARY, fields: { "Assignment Key": "AESOP_CROW_PITCHER" } }] };
    }
    if (params.tableName === "Program Homework Assignments") {
      return {
        records: [
          {
            id: PHA,
            fields: {
              [PHA_AIRTABLE_FIELDS.active]: true,
              [PHA_AIRTABLE_FIELDS.homeworkAssignment]: [{ id: LIBRARY }],
              [PHA_AIRTABLE_FIELDS.week]: [{ id: WEEK }],
              [PHA_AIRTABLE_FIELDS.gradeBand]: [{ id: GRADE_BAND }],
              [PHA_AIRTABLE_FIELDS.programInstanceRid]: "recProgramInst0001",
            },
          },
        ],
      };
    }
    if (params.tableName === "Homework Attempts") {
      return { records: [] };
    }
    if (params.tableName === "Homework Completions") {
      return { records: [] };
    }
    if (params.tableName === "Weekly Athlete Summary") {
      return { records: [] };
    }
    return { records: [] };
  });

  createAirtableRecordMock.mockImplementation(async (params: { tableName: string }) => ({
    id:
      params.tableName === "Homework Completions"
        ? "recHcNew000000001"
        : params.tableName === "Homework Attempts"
          ? "recAttempt0000001"
          : "recWasNew000000001",
  }));
  createAirtableRecordsMock.mockResolvedValue({ records: [] });
  updateAirtableRecordMock.mockImplementation(async (params: { recordId: string }) => ({
    id: params.recordId,
  }));
}

describe("processCurriculumHomeworkSubmit integration", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
    createAirtableRecordMock.mockReset();
    createAirtableRecordsMock.mockReset();
    updateAirtableRecordMock.mockReset();
  });

  it("rejects submit without authorization", async () => {
    installHappyPathMocks();
    const result = await processCurriculumHomeworkSubmit({
      payload: basePayload,
      idempotencyKey: "idem-no-auth-001",
      submitAuthorization: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
  });

  it("rejects mismatched enrollment even with valid ingress-shaped payload", async () => {
    installHappyPathMocks();
    const result = await processCurriculumHomeworkSubmit({
      payload: { ...basePayload, enrollmentId: OTHER_ENROLLMENT },
      idempotencyKey: "idem-mismatch-enr",
      submitAuthorization: submitAuth,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("rejects grade band snapshot that does not match enrollment", async () => {
    installHappyPathMocks();
    const result = await processCurriculumHomeworkSubmit({
      payload: { ...basePayload, gradeBand: "3-4" },
      idempotencyKey: "idem-wrong-band",
      submitAuthorization: submitAuth,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
  });

  it("rejects enrollment with no grade band link", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string }) => {
      if (params.tableName === "Enrollments") {
        return { records: [enrollmentRecord({ "Grade Band": [] })] };
      }
      if (params.tableName === "Homework Attempts") return { records: [] };
      return { records: [] };
    });

    const result = await processCurriculumHomeworkSubmit({
      payload: basePayload,
      idempotencyKey: "idem-no-band",
      submitAuthorization: submitAuth,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
  });

  it("creates Homework Completion, Attempt, and Responses on happy path", async () => {
    installHappyPathMocks();
    const result = await processCurriculumHomeworkSubmit({
      payload: basePayload,
      idempotencyKey: "idem-happy-path-01",
      submitAuthorization: submitAuth,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.homeworkCompletionId).toBe("recHcNew000000001");
    expect(result.receipt.attemptNumber).toBe(1);
    expect(createAirtableRecordMock).toHaveBeenCalled();
    expect(createAirtableRecordsMock).toHaveBeenCalled();
  });

  it("returns idempotent receipt for duplicate Idempotency-Key without re-auth", async () => {
    listAirtableRecordsMock.mockImplementation(async (params: { tableName: string; filterByFormula?: string }) => {
      if (params.tableName === "Homework Attempts" && params.filterByFormula?.includes("idem-dup-key")) {
        return {
          records: [
            {
              id: "recAttemptPrior01",
              fields: {
                "Attempt Number": 1,
                "Homework Completion ID": "recHcPrior0000001",
                "Idempotency Key": "idem-dup-key-001234",
              },
            },
          ],
        };
      }
      return { records: [] };
    });

    const result = await processCurriculumHomeworkSubmit({
      payload: basePayload,
      idempotencyKey: "idem-dup-key-001234",
      submitAuthorization: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.idempotent).toBe(true);
    expect(result.receipt.homeworkCompletionId).toBe("recHcPrior0000001");
  });
});
