import { describe, expect, it } from "vitest";

import {
  formatGameLogDateLine,
  formatGameLogDisplayDate,
  formatGameLogPresentation,
} from "@/lib/data/game-log-presentation";

describe("formatGameLogPresentation", () => {
  it("formats shot submissions with linked total shots in the headline", () => {
    const result = formatGameLogPresentation({
      id: "rec1",
      points: 20,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed.",
      activityDate: "2026-08-22",
      submissionTotalShots: 1250,
    });
    expect(result.headline).toBe("Shot Submission — 1,250 shots");
  });

  it("falls back to reason shot count when linked total shots are missing", () => {
    const result = formatGameLogPresentation({
      id: "rec1b",
      points: 20,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed with 900 shots.",
      activityDate: "2026-08-22",
    });
    expect(result.headline).toBe("Shot Submission — 900 shots");
  });

  it("formats homework with assignment title from linked PHA data", () => {
    const result = formatGameLogPresentation({
      id: "rec5",
      points: 35,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed: Mikan Drill",
      activityDate: "2022-03-23",
      homeworkAssignmentTitle: "Mikan Drill",
    });
    expect(result.headline).toBe("Homework Completed — Mikan Drill");
    expect(result.dateTagline).toBeNull();
  });

  it("adds an Extra credit date tagline when homework Extra Credit XP is present", () => {
    const result = formatGameLogPresentation({
      id: "recHwEc",
      points: 160,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed.",
      activityDate: "2026-08-31",
      homeworkAssignmentTitle: "Shot Tracker Usage",
      homeworkExtraCreditXp: 125,
    });
    expect(result.headline).toBe("Homework Completed — Shot Tracker Usage");
    expect(result.dateTagline).toBe("Extra credit +125 XP");
  });

  it("does not show an Extra credit tagline when Extra Credit XP is zero or missing", () => {
    const zero = formatGameLogPresentation({
      id: "recHwZero",
      points: 35,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed.",
      homeworkAssignmentTitle: "Mikan Drill",
      homeworkExtraCreditXp: 0,
    });
    const missing = formatGameLogPresentation({
      id: "recHwMissing",
      points: 35,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed.",
      homeworkAssignmentTitle: "Mikan Drill",
    });
    expect(zero.dateTagline).toBeNull();
    expect(missing.dateTagline).toBeNull();
  });

  it("does not repeat Homework Completed in the headline detail", () => {
    const result = formatGameLogPresentation({
      id: "recHwDup",
      points: 35,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework Completed",
      activityDate: "2026-08-21",
      homeworkAssignmentTitle: "Mikan Drill",
    });
    expect(result.headline).toBe("Homework Completed — Mikan Drill");
    expect(result.headline.match(/Homework Completed/g)?.length).toBe(1);
  });

  it("falls back to reason homework title when assignment title is missing", () => {
    const result = formatGameLogPresentation({
      id: "recHwFallback",
      points: 35,
      sourceLabel: "Homework Completion",
      reasonPublic: "Homework completed: Shot Tracker Usage",
      activityDate: "2026-08-21",
    });
    expect(result.headline).toBe("Homework Completed — Shot Tracker Usage");
  });

  it("formats video submissions with custom video file name", () => {
    const result = formatGameLogPresentation({
      id: "recVideo",
      points: 15,
      sourceLabel: "Video Submission",
      reasonPublic: "Video submission awarded.",
      activityDate: "2026-08-22",
      videoCustomFileName: "OffTheDribble.mov",
    });
    expect(result.headline).toBe("Video Submission — OffTheDribble.mov");
  });

  it("falls back safely when video filename is missing", () => {
    const result = formatGameLogPresentation({
      id: "recVideoFallback",
      points: 15,
      sourceLabel: "Video Submission",
      reasonPublic: "Coach reviewed shooting form clip",
      activityDate: "2026-08-22",
    });
    expect(result.headline).toBe("Video Submission — Coach reviewed shooting form clip");
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

  it("formats zoom attendance with meeting display name on the subline", () => {
    const result = formatGameLogPresentation({
      id: "recZoom",
      points: 25,
      sourceLabel: "Zoom Attendance: Base",
      reasonPublic: "Attended live Zoom meeting.",
      activityDate: "2026-08-22",
      zoomMeetingDisplayName: "Player Development Zoom",
    });

    expect(result.headline).toBe("Zoom Meeting Attendance");
    expect(result.subline).toBe("Player Development Zoom");
    expect(result.dateOnSecondRowRight).toBe(true);
    expect(result.headline).not.toMatch(/Zoom Attendance|Attended/i);
  });

  it("falls back safely when meeting display name is missing", () => {
    const result = formatGameLogPresentation({
      id: "recZoomFallback",
      points: 10,
      sourceLabel: "Zoom Recording",
      reasonPublic: "Watched the Zoom recording.",
      activityDate: "2026-08-19",
    });

    expect(result.headline).toBe("Zoom Meeting Attendance");
    expect(result.subline).toBe("Zoom meeting");
    expect(result.headline).not.toContain("Attended via Recording");
  });

  it("does not embed XP amounts in the headline", () => {
    const result = formatGameLogPresentation({
      id: "recXp",
      points: 20,
      sourceLabel: "Submission Base",
      reasonPublic: "Shooting submission completed with 45 shots.",
      activityDate: "2026-08-22",
      submissionTotalShots: 45,
    });
    expect(result.headline).not.toMatch(/\+?\d+\s*XP/i);
  });
});

describe("formatGameLogDisplayDate", () => {
  it("does not prefix dates with Date:", () => {
    const formatted = formatGameLogDisplayDate("2026-08-22");
    expect(formatted).not.toMatch(/^Date:/i);
    expect(formatted).toBe("2026-08-22");
  });
});

describe("formatGameLogDateLine", () => {
  it("appends the Extra credit tagline after the date", () => {
    expect(formatGameLogDateLine("2026-08-31", "Extra credit +125 XP")).toBe(
      "2026-08-31 · Extra credit +125 XP",
    );
  });

  it("returns the date alone when no tagline is present", () => {
    expect(formatGameLogDateLine("2026-08-31", null)).toBe("2026-08-31");
    expect(formatGameLogDateLine("2026-08-31")).toBe("2026-08-31");
  });
});
