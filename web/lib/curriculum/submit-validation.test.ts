import { afterEach, describe, expect, it } from "vitest";

import {
  bearerTokenFromAuthorization,
  curriculumIngressSecretValid,
} from "@/lib/curriculum/ingress-auth";
import {
  assertNoForbiddenHcFields,
  buildAttemptKey,
  buildHomeworkCompletionFields,
  buildResponseKey,
  expectedAttemptNumber,
  FORBIDDEN_HC_WRITE_FIELDS,
  formatCurriculumAnswersSnapshot,
  parseCurriculumSubmitPayload,
  parseIdempotencyKey,
} from "@/lib/curriculum/submit-validation";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("curriculumIngressSecretValid", () => {
  it("rejects missing or short secrets", () => {
    delete process.env.CURRICULUM_INGRESS_SECRET;
    expect(curriculumIngressSecretValid("anything-long-enough-to-compare-xx")).toBe(false);

    process.env.CURRICULUM_INGRESS_SECRET = "too-short";
    expect(curriculumIngressSecretValid("too-short")).toBe(false);
  });

  it("accepts an exact timing-safe match of a ≥32 char secret", () => {
    const secret = "curriculum-ingress-secret-32chars!!";
    process.env.CURRICULUM_INGRESS_SECRET = secret;
    expect(curriculumIngressSecretValid(secret)).toBe(true);
    expect(curriculumIngressSecretValid(`${secret}x`)).toBe(false);
    expect(curriculumIngressSecretValid(secret.slice(0, -1))).toBe(false);
    expect(curriculumIngressSecretValid(null)).toBe(false);
  });

  it("does not accept the handoff secret env by mistake", () => {
    process.env.CURRICULUM_HANDOFF_SECRET = "handoff-secret-at-least-32-characters!";
    process.env.CURRICULUM_INGRESS_SECRET = "ingress-secret-at-least-32-characters!";
    expect(curriculumIngressSecretValid(process.env.CURRICULUM_HANDOFF_SECRET)).toBe(false);
    expect(curriculumIngressSecretValid(process.env.CURRICULUM_INGRESS_SECRET)).toBe(true);
  });
});

describe("bearerTokenFromAuthorization", () => {
  it("parses Bearer tokens and rejects other schemes", () => {
    expect(bearerTokenFromAuthorization("Bearer abc.def")).toBe("abc.def");
    expect(bearerTokenFromAuthorization("bearer abc.def")).toBeNull();
    expect(bearerTokenFromAuthorization(null)).toBeNull();
    expect(bearerTokenFromAuthorization("Bearer ")).toBeNull();
  });
});

describe("parseIdempotencyKey", () => {
  it("requires a non-empty key of valid length", () => {
    expect(parseIdempotencyKey(null).ok).toBe(false);
    expect(parseIdempotencyKey("").ok).toBe(false);
    expect(parseIdempotencyKey("short").ok).toBe(false);
    expect(parseIdempotencyKey("a".repeat(129)).ok).toBe(false);
    expect(parseIdempotencyKey("good-key-01").ok).toBe(true);
  });

  it("rejects keys with newlines", () => {
    const result = parseIdempotencyKey("bad-key\ninjection");
    expect(result.ok).toBe(false);
  });
});

describe("parseCurriculumSubmitPayload", () => {
  const validBody = {
    enrollmentId: "recEnroll00000001",
    assignmentKey: "AESOP_CROW_PITCHER",
    curriculumVersion: 1,
    gradeBand: "4-6",
    attemptNumber: 1,
    parentAttemptNumber: null,
    submittedAt: "2026-09-07T12:00:00.000Z",
    answers: [
      {
        questionKey: "AESOP_CROW_PITCHER.4-6.Q01",
        questionOrder: 1,
        responseType: "short_answer",
        promptSnapshot: "What did the crow do?",
        value: "Dropped pebbles",
      },
    ],
  };

  it("accepts a contract-shaped payload", () => {
    const parsed = parseCurriculumSubmitPayload(validBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.assignmentKey).toBe("AESOP_CROW_PITCHER");
    expect(parsed.value.answers).toHaveLength(1);
  });

  it("rejects invalid enrollment, band, and empty answers", () => {
    expect(parseCurriculumSubmitPayload({ ...validBody, enrollmentId: "nope" }).ok).toBe(false);
    expect(parseCurriculumSubmitPayload({ ...validBody, gradeBand: "K-12" }).ok).toBe(false);
    expect(parseCurriculumSubmitPayload({ ...validBody, answers: [] }).ok).toBe(false);
    expect(parseCurriculumSubmitPayload({ ...validBody, submittedAt: "not-a-date" }).ok).toBe(
      false,
    );
  });

  it("rejects parentAttemptNumber >= attemptNumber", () => {
    const result = parseCurriculumSubmitPayload({
      ...validBody,
      attemptNumber: 2,
      parentAttemptNumber: 2,
    });
    expect(result.ok).toBe(false);
  });
});

describe("HC field mapping", () => {
  const answers = [
    {
      questionKey: "AESOP_CROW_PITCHER.4-6.Q02",
      questionOrder: 2,
      responseType: "short_answer",
      promptSnapshot: "Second?",
      value: "B",
    },
    {
      questionKey: "AESOP_CROW_PITCHER.4-6.Q01",
      questionOrder: 1,
      responseType: "short_answer",
      promptSnapshot: "First?",
      value: "A",
    },
  ];

  it("formats a coach-readable answers snapshot in question order", () => {
    expect(formatCurriculumAnswersSnapshot(answers)).toBe(
      "Q1. First?\nA: A\n\nQ2. Second?\nA: B",
    );
  });

  it("maps required HC fields and never includes XP or review-complete fields", () => {
    const fields = buildHomeworkCompletionFields({
      enrollmentId: "recEnroll00000001",
      libraryId: "recLibrary0000001",
      phaId: "recPha00000000001",
      weekId: "recWeek0000000001",
      idempotencyKey: "idem-key-123456",
      assignmentKey: "AESOP_CROW_PITCHER",
      submittedAt: "2026-09-07T18:30:00.000Z",
      answers,
      notes: ["PHA unresolved note"],
    });

    expect(fields).toMatchObject({
      Enrollment: ["recEnroll00000001"],
      Homework: ["recLibrary0000001"],
      "Program Homework Assignment": ["recPha00000000001"],
      Week: ["recWeek0000000001"],
      "Completion Status": "Submitted",
      "Review Status": "Ready for Review",
      "Submission Date": "2026-09-07",
      "Source System": "Curriculum Hub",
      "Item Type": "Homework",
      "Curriculum Idempotency Key": "idem-key-123456",
      "Assignment Key": "AESOP_CROW_PITCHER",
    });
    expect(fields["Curriculum Answers Snapshot"]).toContain("Q1. First?");
    expect(fields.Notes).toContain("PHA unresolved note");

    for (const forbidden of FORBIDDEN_HC_WRITE_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(fields, forbidden)).toBe(false);
    }
    expect(() => assertNoForbiddenHcFields(fields as unknown as Record<string, unknown>)).not.toThrow();
    expect(() =>
      assertNoForbiddenHcFields({ ...fields, "Satisfactory?": true } as Record<string, unknown>),
    ).toThrow(/Satisfactory/);
  });

  it("omits PHA and Week when unresolved", () => {
    const fields = buildHomeworkCompletionFields({
      enrollmentId: "recEnroll00000001",
      libraryId: "recLibrary0000001",
      phaId: null,
      weekId: null,
      idempotencyKey: "idem-key-123456",
      assignmentKey: "AESOP_CROW_PITCHER",
      submittedAt: "2026-09-07T18:30:00.000Z",
      answers,
    });
    expect(fields["Program Homework Assignment"]).toBeUndefined();
    expect(fields.Week).toBeUndefined();
  });
});

describe("attempt helpers", () => {
  it("builds attempt and response keys", () => {
    expect(
      buildAttemptKey({
        enrollmentId: "recEnroll00000001",
        assignmentKey: "AESOP_CROW_PITCHER",
        attemptNumber: 2,
      }),
    ).toBe("recEnroll00000001|AESOP_CROW_PITCHER|2");
    expect(buildResponseKey("recEnroll00000001|AESOP_CROW_PITCHER|2", "Q01")).toBe(
      "recEnroll00000001|AESOP_CROW_PITCHER|2|Q01",
    );
  });

  it("computes expected attempt numbers for new and Needs Revision flows", () => {
    expect(
      expectedAttemptNumber({
        existingMaxAttempt: 0,
        isNeedsRevision: false,
        isNewCompletion: true,
      }),
    ).toBe(1);
    expect(
      expectedAttemptNumber({
        existingMaxAttempt: 1,
        isNeedsRevision: true,
        isNewCompletion: false,
      }),
    ).toBe(2);
  });
});
