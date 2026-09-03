import { describe, expect, it } from "vitest";

import {
  classifyGameLogCategory,
  filterXpRowsByCategory,
  parseGameLogCategoryParam,
  PUBLIC_GAME_LOG_CATEGORY_OPTIONS,
  PRIVATE_GAME_LOG_CATEGORY_OPTIONS,
  GAME_LOG_CATEGORY_OPTIONS,
} from "@/lib/data/game-log-categories";
import type { XpEventSummary } from "@/types/xp";

function row(overrides: Partial<XpEventSummary>): XpEventSummary {
  return {
    id: "recXpCategory0001",
    points: 10,
    activityDate: "2026-09-01",
    ...overrides,
  };
}

describe("game-log-categories", () => {
  it("exposes the nine requested labels for public and private", () => {
    const labels = GAME_LOG_CATEGORY_OPTIONS.map((o) => o.label);
    expect(labels).toEqual([
      "Shooting Submission",
      "Homework",
      "Video Feedback",
      "Zoom",
      "Streak",
      "Weekly Threshold",
      "Shot Milestone",
      "Perfect Week",
      "Manual Award",
    ]);
    expect(PUBLIC_GAME_LOG_CATEGORY_OPTIONS).toHaveLength(9);
    expect(PRIVATE_GAME_LOG_CATEGORY_OPTIONS).toHaveLength(9);
    expect(PUBLIC_GAME_LOG_CATEGORY_OPTIONS.every((o) => o.publicSafe)).toBe(true);
  });

  it("classifies XP sources into the expected categories", () => {
    expect(classifyGameLogCategory(row({ sourceLabel: "Submission Base" }))).toBe(
      "shooting_submission",
    );
    expect(classifyGameLogCategory(row({ sourceLabel: "Homework Completion" }))).toBe("homework");
    expect(classifyGameLogCategory(row({ sourceLabel: "Video Submission" }))).toBe("video_feedback");
    expect(classifyGameLogCategory(row({ sourceLabel: "Zoom Attendance: Base" }))).toBe("zoom");
    expect(classifyGameLogCategory(row({ sourceLabel: "Zoom Recording" }))).toBe("zoom");
    expect(classifyGameLogCategory(row({ sourceLabel: "Streak" }))).toBe("streak");
    expect(classifyGameLogCategory(row({ sourceLabel: "Weekly Threshold 150" }))).toBe(
      "weekly_threshold",
    );
    expect(classifyGameLogCategory(row({ sourceLabel: "Shot Milestone" }))).toBe("shot_milestone");
    expect(classifyGameLogCategory(row({ sourceLabel: "Perfect Week" }))).toBe("perfect_week");
    expect(classifyGameLogCategory(row({ sourceLabel: "Manual Bonus" }))).toBe("manual_award");
  });

  it("does not invent Source Keys or Airtable ids in category options", () => {
    const blob = JSON.stringify(GAME_LOG_CATEGORY_OPTIONS);
    expect(blob).not.toMatch(/rec[A-Za-z0-9]{14}/);
    expect(blob).not.toMatch(/SOURCE_KEY|Source Key|SUBMISSION_XP\|/i);
  });

  it("filters rows by category and leaves unmatched rows out", () => {
    const rows = [
      row({ id: "rec1", sourceLabel: "Submission Base" }),
      row({ id: "rec2", sourceLabel: "Homework Completion" }),
      row({ id: "rec3", sourceLabel: "Zoom Attendance: Base" }),
    ];
    expect(filterXpRowsByCategory(rows, "homework").map((r) => r.id)).toEqual(["rec2"]);
    expect(filterXpRowsByCategory(rows, null)).toHaveLength(3);
  });

  it("parses category query params safely", () => {
    expect(parseGameLogCategoryParam("homework")).toBe("homework");
    expect(parseGameLogCategoryParam("ALL")).toBe(null);
    expect(parseGameLogCategoryParam("not-a-category")).toBe(null);
    expect(parseGameLogCategoryParam(null)).toBe(null);
  });
});
