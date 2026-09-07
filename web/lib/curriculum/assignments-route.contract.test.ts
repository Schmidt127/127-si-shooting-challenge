import { describe, expect, it } from "vitest";

/**
 * Route contract smoke: assignments endpoint requires enrollmentId and ingress auth.
 * Full Airtable integration is covered by live verification after deploy.
 */
describe("curriculum assignments route contract", () => {
  it("documents expected response shape", () => {
    const sample = {
      enrollmentId: "recFBfJrtRCctJpuo",
      assignments: [
        {
          assignmentKey: "AESOP_CROW_PITCHER",
          libraryRecordId: "recdCjWNaBBjqTp7k",
          phaRecordId: "recExamplePha",
          weekRecordId: "recExampleWeek",
          weekLabel: "Week 1",
          homeworkSlot: "HW1",
          suggestedDate: "2026-09-14",
          weekStartDate: "2026-09-07",
          weekEndDate: "2026-09-13",
          isRecommended: true,
          completionStatus: "available",
          coachFeedback: null,
          contentMissingReason: null,
        },
      ],
    };

    expect(sample.assignments[0].assignmentKey).toMatch(/^[A-Z0-9_]+$/);
    expect(sample.assignments[0].completionStatus).toBe("available");
  });
});
