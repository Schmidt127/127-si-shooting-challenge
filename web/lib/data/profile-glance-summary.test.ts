import { describe, expect, it } from "vitest";

import {
  buildProfileGlanceSummary,
  countOpenHomework,
  pickPerfectWeekGlance,
} from "@/lib/data/profile-glance-summary";
import type {
  PublicHomeworkAssignment,
  PublicWeeklySummary,
} from "@/types/public-athlete-profile";

const baseAssignment = (
  overrides: Partial<PublicHomeworkAssignment> = {},
): PublicHomeworkAssignment => ({
  key: "hw-1",
  assignmentName: "Form shooting",
  description: null,
  weekLabel: "Week 1",
  dueDate: "2026-01-10",
  completionStatus: "not_started",
  completionStatusLabel: "Not started",
  submissionDate: null,
  xpAwarded: null,
  coachFeedback: null,
  creditEligible: null,
  pastDue: false,
  lateSubmission: false,
  homeworkDetailHref: null,
  viewSubmittedHomeworkHref: null,
  ...overrides,
});

const baseWeek = (overrides: Partial<PublicWeeklySummary> = {}): PublicWeeklySummary => ({
  key: "w1",
  weekLabel: "Week 1",
  weekDateRange: "Jan 1–7",
  totalShots: 100,
  daysLogged: 3,
  weeklyXp: 50,
  goalCompletionPercent: 80,
  momentumStatus: "Building",
  homeworkCompleted: false,
  perfectWeek: false,
  videoCount: 1,
  homeworkStatus: null,
  zoomStatus: null,
  perfectWeekStatusLabel: "In Progress",
  ...overrides,
});

describe("countOpenHomework", () => {
  it("counts not started and in-review assignments", () => {
    const assignments = [
      baseAssignment({ key: "a1", completionStatus: "approved" }),
      baseAssignment({ key: "a2", completionStatus: "not_started" }),
      baseAssignment({ key: "a3", completionStatus: "under_review" }),
    ];
    expect(countOpenHomework(assignments)).toBe(2);
  });

  it("returns zero when all assignments are complete", () => {
    expect(
      countOpenHomework([
        baseAssignment({ completionStatus: "approved" }),
        baseAssignment({ key: "a2", completionStatus: "not_accepted" }),
      ]),
    ).toBe(0);
  });
});

describe("pickPerfectWeekGlance", () => {
  it("prefers in-progress week over completed weeks", () => {
    const weeks = [
      baseWeek({ key: "w2", weekLabel: "Week 2", perfectWeekStatusLabel: "Perfect Week" }),
      baseWeek({ key: "w3", weekLabel: "Week 3", perfectWeekStatusLabel: "In Progress" }),
    ];
    expect(pickPerfectWeekGlance(weeks)).toEqual({
      label: "Week 3",
      status: "In Progress",
    });
  });

  it("falls back to first week when none are in progress", () => {
    const weeks = [
      baseWeek({ perfectWeekStatusLabel: "Not Perfect" }),
      baseWeek({ key: "w2", weekLabel: "Week 2", perfectWeekStatusLabel: "Perfect Week" }),
    ];
    expect(pickPerfectWeekGlance(weeks)).toEqual({
      label: "Week 1",
      status: "Not Perfect",
    });
  });
});

describe("buildProfileGlanceSummary", () => {
  it("builds parent-facing glance fields from profile slices", () => {
    const summary = buildProfileGlanceSummary({
      identity: {
        slug: "test",
        displayName: "Test Athlete",
        school: "Fairfield",
        grade: "8",
        seasonLabel: "2026",
        programLabel: null,
        level: "Starter",
        levelCoverImageUrl: null,
        rank: 3,
        headshotUrl: null,
        progressionStatus: null,
      },
      performance: {
        totalShots: 500,
        lifetimeXp: 1200,
        currentLevel: "Starter",
        currentLevelCoverImageUrl: null,
        xpNeededForNextLevel: 300,
        currentStreak: 4,
        longestStreak: 10,
        totalSubmissions: 20,
        lastSubmissionDate: "Jan 5",
      },
      recentActivity: [
        {
          key: "act-1",
          kind: "submission",
          date: "Jan 5",
          title: "Daily submission",
          detail: "50 shots",
          shots: 50,
          makes: null,
          xp: 25,
          hasDetailedStats: false,
        },
      ],
      homeworkAssignments: [baseAssignment()],
      weekly: [baseWeek()],
      achievements: [
        {
          key: "ach-1",
          name: "First streak",
          type: null,
          category: null,
          group: "Streaks",
          unlockedAt: "Jan 1",
          triggerValue: null,
          xpAwarded: 10,
          rarity: "Common",
          badgeIconName: "bolt",
        },
      ],
    });

    expect(summary.levelLabel).toBe("Starter");
    expect(summary.lifetimeXp).toBe(1200);
    expect(summary.recentActivityLabel).toBe("Daily submission · Jan 5");
    expect(summary.homeworkOpenCount).toBe(1);
    expect(summary.perfectWeekLabel).toBe("Week 1");
    expect(summary.perfectWeekStatus).toBe("In Progress");
    expect(summary.achievementCount).toBe(1);
  });
});
