import { describe, expect, it } from "vitest";

/**
 * Documents the Hub → SC library sync contract (POST /api/curriculum/library/sync).
 */
describe("curriculum library sync contract", () => {
  it("documents request and response shapes", () => {
    const request = {
      assignmentKey: "AESOP_CROW_PITCHER",
      homeworkLibraryRecordId: "recdCjWNaBBjqTp7k",
      assignmentTitle: "The Crow and the Pitcher",
      curriculumVersion: 1,
    };

    const response = {
      status: "updated" as const,
      assignmentKey: "AESOP_CROW_PITCHER",
      homeworkLibraryRecordId: "recdCjWNaBBjqTp7k",
    };

    expect(request.assignmentKey).toMatch(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/);
    expect(["created", "updated", "unchanged"]).toContain(response.status);
  });

  it("documents PHA-targeted backfill from assignments API", () => {
    const fromAssignmentsGap = {
      assignmentKey: "SHOT_TRACKER_SETUP",
      phaRecordId: "rec07GWst0ZXBKz7U",
      assignmentTitle: "Shot Tracker Setup",
    };
    expect(fromAssignmentsGap.phaRecordId).toMatch(/^rec[a-zA-Z0-9]{14}$/);
  });
});
