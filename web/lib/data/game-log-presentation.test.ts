import { describe, expect, it } from "vitest";

import {
  formatGameLogDisplayDate,
  formatGameLogPresentation,
} from "@/lib/data/game-log-presentation";

describe("formatGameLogPresentation", () => {
  it("formats shot submissions with total shots in the headline", () => {
    const result = formatGameLogPresentation({
      id: "rec1",
      points: 20,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed with 1,250 shots.",
      activityDate: "2026-08-22",
    });
    expect(result.headline).toBe("Shot Submission — 1,250 shots");
  });

  it("formats homework with assignment name and Completed label", () => {
    const result = formatGameLogPresentation({
      id: "rec5",
      points: 35,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed: Mikan Drill",
      activityDate: "2022-03-23",
    });
    expect(result.headline).toBe("Homework Completed — Mikan Drill");
  });

  it("formats weekly shot targets with percentage", () => {
    const result = formatGameLogPresentation({
      id: "recWeekly",
      points: 30,
      sourceLabel: "Weekly Threshold 150",
      reasonPublic: "Reached 150% of weekly shot goal.",
      activityDate: "2026-03-22",
    });
    expect(result.headline).toBe("Weekly Shot Target — 150%");
  });

  it("formats milestones with percentage", () => {
    const result = formatGameLogPresentation({
      id: "rec2",
      points: 40,
      sourceLabel: "Shot Milestone",
      reasonPublic: "Shot milestone reached: 125% milestone.",
      activityDate: "2026-03-22",
    });
    expect(result.headline).toBe("Milestone Achieved — 125%");
  });

  it("formats streaks with streak description", () => {
    const result = formatGameLogPresentation({
      id: "rec3",
      points: 25,
      sourceLabel: "Streak",
      reasonPublic: "3-day shooting streak completed.",
      activityDate: "2026-08-20",
    });
    expect(result.headline).toBe("Streak — 3 Day Shooting Streak");
  });

  it("formats manual bonus with reason detail", () => {
    const result = formatGameLogPresentation({
      id: "recBonus",
      points: 25,
      sourceLabel: "Manual Bonus",
      reasonPublic: "Coach award",
      activityDate: "2026-08-22",
    });
    expect(result.headline).toBe("Manual Bonus — Coach award");
  });

  it("maps zoom attendance modes", () => {
    expect(
      formatGameLogPresentation({
        id: "rec4",
        points: 10,
        sourceLabel: "Zoom Recording",
        reasonPublic: "Watched the Zoom recording.",
        activityDate: "2026-08-19",
      }).headline,
    ).toBe("Zoom Attendance — Attended via Recording");
  });

  it("does not embed XP amounts in the headline", () => {
    const result = formatGameLogPresentation({
      id: "recXp",
      points: 20,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed with 45 shots.",
      activityDate: "2026-08-22",
    });
    expect(result.headline).not.toMatch(/\+?\d+\s*XP/i);
  });
});

describe("formatGameLogDisplayDate", () => {
  it("does not prefix dates with Date:", () => {
    const formatted = formatGameLogDisplayDate("2026-08-22");
    expect(formatted).not.toMatch(/^Date:/i);
    expect(formatted).toBe("08/22/2026");
  });
});
