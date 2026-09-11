import { afterEach, describe, expect, it } from "vitest";

import {
  __resetCurriculumSubmitAuthMemoryForTests,
  loadCurriculumSubmitAuthorization,
  mintCurriculumSubmitAuthorization,
  parseSubmitAuthorizationToken,
  validateCurriculumSubmitAuthorization,
} from "@/lib/curriculum/submit-auth";

afterEach(() => {
  __resetCurriculumSubmitAuthMemoryForTests();
});

describe("mintCurriculumSubmitAuthorization", () => {
  it("mints a token bound to enrollment, grade band, and optional assignment", async () => {
    const token = await mintCurriculumSubmitAuthorization({
      enrollmentId: "recEnroll00000001",
      gradeBand: "5-6",
      assignmentKey: "SHOT_TRACKER_SETUP",
      now: 1_700_000_000_000,
    });
    expect(token.length).toBeGreaterThan(40);

    const record = await loadCurriculumSubmitAuthorization(token, 1_700_000_000_000);
    expect(record).toMatchObject({
      enrollmentId: "recEnroll00000001",
      gradeBand: "5-6",
      assignmentKey: "SHOT_TRACKER_SETUP",
    });
  });

  it("rejects expired authorization", async () => {
    const token = await mintCurriculumSubmitAuthorization({
      enrollmentId: "recEnroll00000001",
      gradeBand: "3-4",
      now: 1_700_000_000_000,
    });
    const expired = await loadCurriculumSubmitAuthorization(
      token,
      1_700_000_000_000 + 5 * 60 * 60 * 1000,
    );
    expect(expired).toBeNull();
  });
});

describe("validateCurriculumSubmitAuthorization", () => {
  const auth = {
    enrollmentId: "recEnroll00000001",
    gradeBand: "5-6" as const,
    assignmentKey: "AESOP_CROW_PITCHER",
    createdAt: 1,
    expiresAt: 9_999_999_999,
  };

  it("accepts matching enrollment, assignment, and grade band", () => {
    expect(
      validateCurriculumSubmitAuthorization({
        authorization: auth,
        enrollmentId: "recEnroll00000001",
        assignmentKey: "AESOP_CROW_PITCHER",
        gradeBand: "5-6",
      }).ok,
    ).toBe(true);
  });

  it("rejects mismatched enrollment", () => {
    const result = validateCurriculumSubmitAuthorization({
      authorization: auth,
      enrollmentId: "recEnrollOTHER0001",
      assignmentKey: "AESOP_CROW_PITCHER",
      gradeBand: "5-6",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("rejects mismatched assignment when handoff bound one", () => {
    const result = validateCurriculumSubmitAuthorization({
      authorization: auth,
      enrollmentId: "recEnroll00000001",
      assignmentKey: "OTHER_ASSIGNMENT",
      gradeBand: "5-6",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("rejects mismatched grade band", () => {
    const result = validateCurriculumSubmitAuthorization({
      authorization: auth,
      enrollmentId: "recEnroll00000001",
      assignmentKey: "AESOP_CROW_PITCHER",
      gradeBand: "3-4",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
  });

  it("accepts Curriculum question set 4-6 when auth carries program band 5-6", () => {
    expect(
      validateCurriculumSubmitAuthorization({
        authorization: auth,
        enrollmentId: "recEnroll00000001",
        assignmentKey: "AESOP_CROW_PITCHER",
        gradeBand: "4-6",
      }).ok,
    ).toBe(true);
  });

  it("rejects missing authorization", () => {
    const result = validateCurriculumSubmitAuthorization({
      authorization: null,
      enrollmentId: "recEnroll00000001",
      assignmentKey: "AESOP_CROW_PITCHER",
      gradeBand: "5-6",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
  });
});

describe("parseSubmitAuthorizationToken", () => {
  it("prefers header over body field", () => {
    expect(
      parseSubmitAuthorizationToken({
        header: "header-token",
        bodyField: "body-token",
      }),
    ).toBe("header-token");
  });
});
