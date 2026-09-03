/**
 * Game Log category classification and filtering.
 */

import { describe, expect, it } from "vitest";

import {
  filterXpSummariesByCategory,
  parseGameLogCategoryParam,
  resolveGameLogCategory,
} from "@/lib/data/game-log-categories";

describe("resolveGameLogCategory", () => {
  it("maps XP Source labels to product categories", () => {
    expect(resolveGameLogCategory("Submission Base")).toBe("shooting-submission");
    expect(resolveGameLogCategory("Shooting Base")).toBe("shooting-submission");
    expect(resolveGameLogCategory("Homework Completion")).toBe("homework");
    expect(resolveGameLogCategory("Video Submission")).toBe("video-feedback");
    expect(resolveGameLogCategory("Video Feedback")).toBe("video-feedback");
    expect(resolveGameLogCategory("Zoom Attendance: Base")).toBe("zoom");
    expect(resolveGameLogCategory("Zoom Recording")).toBe("zoom");
    expect(resolveGameLogCategory("7-Day Streak")).toBe("streak");
    expect(resolveGameLogCategory("Weekly Threshold 100")).toBe("weekly-threshold");
    expect(resolveGameLogCategory("Shot Milestone")).toBe("shot-milestone");
    expect(resolveGameLogCategory("Perfect Week")).toBe("perfect-week");
    expect(resolveGameLogCategory("Manual Bonus")).toBe("manual-award");
  });

  it("does not invent categories for unknown sources", () => {
    expect(resolveGameLogCategory("Achievement")).toBeNull();
    expect(resolveGameLogCategory("")).toBeNull();
  });
});

describe("parseGameLogCategoryParam", () => {
  it("accepts stable slug ids only", () => {
    expect(parseGameLogCategoryParam("homework")).toBe("homework");
    expect(parseGameLogCategoryParam("Shooting-Submission")).toBe("shooting-submission");
    expect(parseGameLogCategoryParam("recXXXXXXXXXXXXXX")).toBeNull();
    expect(parseGameLogCategoryParam("SUBMISSION_XP|rec123")).toBeNull();
    expect(parseGameLogCategoryParam("not-a-category")).toBeNull();
  });
});

describe("filterXpSummariesByCategory", () => {
  const rows = [
    { sourceLabel: "Submission Base", reasonPublic: "100 shots" },
    { sourceLabel: "Homework Completion", reasonPublic: "Done" },
    { sourceLabel: "Zoom Attendance: Base", reasonPublic: "Live" },
  ];

  it("returns all rows when category is null", () => {
    expect(filterXpSummariesByCategory(rows, null)).toHaveLength(3);
  });

  it("filters to a single category", () => {
    const filtered = filterXpSummariesByCategory(rows, "homework");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].sourceLabel).toBe("Homework Completion");
  });
});
