import { describe, expect, it } from "vitest";

import { parseLibrarySyncPayload } from "@/lib/curriculum/library-sync-validation";

describe("parseLibrarySyncPayload", () => {
  it("accepts assignmentKey with library record id", () => {
    const parsed = parseLibrarySyncPayload({
      assignmentKey: "SHOT_TRACKER_SETUP",
      homeworkLibraryRecordId: "recLibrary0000001",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.assignmentKey).toBe("SHOT_TRACKER_SETUP");
      expect(parsed.value.homeworkLibraryRecordId).toBe("recLibrary0000001");
    }
  });

  it("accepts phaRecordId target", () => {
    const parsed = parseLibrarySyncPayload({
      assignmentKey: "AESOP_CROW_PITCHER",
      phaRecordId: "recPha00000000001",
    });
    expect(parsed.ok).toBe(true);
  });

  it("accepts create payload with assignmentTitle", () => {
    const parsed = parseLibrarySyncPayload({
      assignmentKey: "NEW_LESSON_ALPHA",
      assignmentTitle: "New Lesson Alpha",
      curriculumVersion: 1,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.assignmentTitle).toBe("New Lesson Alpha");
      expect(parsed.value.curriculumVersion).toBe(1);
    }
  });

  it("rejects invalid assignmentKey", () => {
    const parsed = parseLibrarySyncPayload({
      assignmentKey: "recdCjWNaBBjqTp7k",
      homeworkLibraryRecordId: "recLibrary0000001",
    });
    expect(parsed.ok).toBe(false);
  });

  it("requires a target or title", () => {
    const parsed = parseLibrarySyncPayload({
      assignmentKey: "AESOP_CROW_PITCHER",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.status).toBe(422);
  });
});
