import { describe, expect, it } from "vitest";

import {
  curriculumHomeworkStartHref,
  curriculumHubCtaLabel,
  normalizeCurriculumAssignmentKey,
  resolveAthleteHomeworkDetailHref,
} from "./homework-link";

describe("curriculum homework links", () => {
  it("normalizes Crow Assignment Key", () => {
    expect(normalizeCurriculumAssignmentKey("AESOP_CROW_PITCHER")).toBe("AESOP_CROW_PITCHER");
    expect(normalizeCurriculumAssignmentKey(" aesop_crow_pitcher ")).toBe("AESOP_CROW_PITCHER");
    expect(normalizeCurriculumAssignmentKey("recdCjWNaBBjqTp7k")).toBeNull();
    expect(normalizeCurriculumAssignmentKey("")).toBeNull();
  });

  it("routes Crow via curriculum start handoff, never SC library record id", () => {
    const href = resolveAthleteHomeworkDetailHref({
      assignmentKey: "AESOP_CROW_PITCHER",
      homeworkLibraryRecordId: "recdCjWNaBBjqTp7k",
    });
    expect(href).toBe("/api/curriculum/start?assignmentKey=AESOP_CROW_PITCHER");
    expect(href?.includes("recdCjWNaBBjqTp7k")).toBe(false);
    expect(href?.includes("/homework/rec")).toBe(false);
  });

  it("keeps legacy SC library detail when Assignment Key is absent", () => {
    expect(
      resolveAthleteHomeworkDetailHref({
        assignmentKey: null,
        homeworkLibraryRecordId: "recdCjWNaBBjqTp7k",
      }),
    ).toBe("/homework/recdCjWNaBBjqTp7k");
  });

  it("builds start href for Crow", () => {
    expect(curriculumHomeworkStartHref("AESOP_CROW_PITCHER")).toBe(
      "/api/curriculum/start?assignmentKey=AESOP_CROW_PITCHER",
    );
  });

  it("labels submitted Curriculum rows as View submission", () => {
    expect(
      curriculumHubCtaLabel({
        badgeStatus: "submitted",
        completionStatus: "submitted",
      }),
    ).toBe("View submission");
    expect(
      curriculumHubCtaLabel({
        badgeStatus: "needs_revision",
        completionStatus: "needs_revision",
      }),
    ).toBe("Revise homework");
    expect(
      curriculumHubCtaLabel({
        badgeStatus: "pending",
        completionStatus: "not_started",
      }),
    ).toBe("Open Homework");
  });
});
