import { describe, expect, it } from "vitest";

import {
  allowedCurriculumSubmitBandsForEnrollmentName,
  validateSubmittedGradeBandSnapshot,
} from "@/lib/curriculum/grade-band-validation";

describe("allowedCurriculumSubmitBandsForEnrollmentName", () => {
  it("maps the five SC enrollment bands to structured submit snapshots", () => {
    expect(allowedCurriculumSubmitBandsForEnrollmentName("K-2")).toEqual(["1-2", "K-3"]);
    expect(allowedCurriculumSubmitBandsForEnrollmentName("3-4")).toEqual([
      "3-4",
      "K-3",
      "4-6",
    ]);
    expect(allowedCurriculumSubmitBandsForEnrollmentName("5-6")).toEqual(["5-6", "4-6"]);
    expect(allowedCurriculumSubmitBandsForEnrollmentName("7-8")).toEqual(["7-8"]);
    expect(allowedCurriculumSubmitBandsForEnrollmentName("9-12")).toEqual(["9-12"]);
  });

  it("returns null for missing or malformed enrollment bands", () => {
    expect(allowedCurriculumSubmitBandsForEnrollmentName(null)).toBeNull();
    expect(allowedCurriculumSubmitBandsForEnrollmentName("")).toBeNull();
    expect(allowedCurriculumSubmitBandsForEnrollmentName("College")).toBeNull();
  });
});

describe("validateSubmittedGradeBandSnapshot", () => {
  it("accepts a snapshot that matches enrollment and authorized session", () => {
    expect(
      validateSubmittedGradeBandSnapshot({
        enrollmentGradeBandName: "5-6",
        authorizedGradeBand: "5-6",
        submittedGradeBand: "5-6",
      }).ok,
    ).toBe(true);
  });

  it("accepts Curriculum question set 4-6 when authorized program band is 5-6", () => {
    expect(
      validateSubmittedGradeBandSnapshot({
        enrollmentGradeBandName: "5-6",
        authorizedGradeBand: "5-6",
        submittedGradeBand: "4-6",
      }).ok,
    ).toBe(true);
  });

  it("accepts Curriculum K-3 for program band 3-4 (grade 3)", () => {
    expect(
      validateSubmittedGradeBandSnapshot({
        enrollmentGradeBandName: "3-4",
        authorizedGradeBand: "3-4",
        submittedGradeBand: "K-3",
      }).ok,
    ).toBe(true);
  });

  it("rejects a client-provided band that does not match enrollment", () => {
    const result = validateSubmittedGradeBandSnapshot({
      enrollmentGradeBandName: "3-4",
      authorizedGradeBand: "3-4",
      submittedGradeBand: "5-6",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
  });

  it("rejects when enrollment grade band is missing", () => {
    const result = validateSubmittedGradeBandSnapshot({
      enrollmentGradeBandName: null,
      authorizedGradeBand: "5-6",
      submittedGradeBand: "5-6",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects Curriculum set that is not allowed for the authorized program band", () => {
    const result = validateSubmittedGradeBandSnapshot({
      enrollmentGradeBandName: "5-6",
      authorizedGradeBand: "5-6",
      submittedGradeBand: "9-12",
    });
    expect(result.ok).toBe(false);
  });
});
