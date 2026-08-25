import { describe, expect, it } from "vitest";

import { formatGameLogPresentation } from "@/lib/data/game-log-presentation";

describe("formatGameLogPresentation", () => {
  it("maps shot submissions to short titles with shot counts", () => {
    const result = formatGameLogPresentation({
      id: "rec1",
      points: 20,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed with 45 shots.",
      activityDate: "2026-08-22",
    });
    expect(result).toEqual({ title: "Shot Submission", detail: "45 shots" });
  });

  it("maps milestones to percent goal copy", () => {
    const result = formatGameLogPresentation({
      id: "rec2",
      points: 30,
      sourceLabel: "Shot Milestone",
      reasonPublic: "Shot milestone reached: 75% of target goal.",
      activityDate: "2026-08-21",
    });
    expect(result.title).toBe("Shot Milestone");
    expect(result.detail).toContain("75%");
  });

  it("maps streaks without duplicating XP in detail", () => {
    const result = formatGameLogPresentation({
      id: "rec3",
      points: 25,
      sourceLabel: "Streak",
      reasonPublic: "3-day shooting streak completed.",
      activityDate: "2026-08-20",
    });
    expect(result.title).toBe("Streak");
    expect(result.detail).toContain("3 Day Shooting Streak");
  });

  it("maps zoom attendance modes", () => {
    expect(
      formatGameLogPresentation({
        id: "rec4",
        points: 10,
        sourceLabel: "Zoom Recording",
        reasonPublic: "Watched the Zoom recording.",
        activityDate: "2026-08-19",
      }).detail,
    ).toBe("Attended via Recording");
  });

  it("maps homework to assignment-style detail", () => {
    const result = formatGameLogPresentation({
      id: "rec5",
      points: 15,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed: Shot Challenge Tracker",
      activityDate: "2026-08-18",
    });
    expect(result.title).toBe("Homework");
    expect(result.detail).toContain("Shot Challenge Tracker");
  });
});
