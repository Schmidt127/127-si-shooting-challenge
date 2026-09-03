import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RecentActivityLog } from "@/components/athlete/recent-activity-log";
import { mapXpSummariesToPublicActivity } from "@/lib/data/public-athlete-profile";
import { sortXpEventsNewestFirst } from "@/lib/data/xp-activity-loader";
import type { PublicActivityItem } from "@/types/public-athlete-profile";
import type { XpEventSummary } from "@/types/xp";

function xpRow(overrides: Partial<XpEventSummary>): XpEventSummary {
  return {
    id: "recDefault0000001",
    points: 20,
    sourceLabel: "Submission Base",
    reasonPublic: "Shooting submission completed with 100 shots.",
    activityDate: "2026-08-22",
    ...overrides,
  };
}

function renderLog(items: PublicActivityItem[]) {
  return renderToStaticMarkup(
    createElement(RecentActivityLog, {
      slug: "test-athlete",
      items,
    }),
  );
}

describe("XP Event Log presentation", () => {
  it("renders public-safe category filter toolbar", () => {
    const html = renderLog(
      mapXpSummariesToPublicActivity([
        xpRow({
          id: "recSubFilter",
          reasonPublic: "Shooting submission completed with 100 shots.",
        }),
      ]),
    );
    expect(html).toContain('data-testid="public-game-log-category-toolbar"');
    expect(html).toContain("Shooting Submission");
    expect(html).toContain("Homework");
    expect(html).toContain("Video Feedback");
    expect(html).toContain("Zoom");
    expect(html).toContain("Streak");
    expect(html).toContain("Weekly Threshold");
    expect(html).toContain("Shot Milestone");
    expect(html).toContain("Perfect Week");
    expect(html).toContain("Manual Award");
    expect(html).toContain("overflow-x-auto");
    expect(html).not.toMatch(/recSubFilter/);
    expect(html).not.toMatch(/SUBMISSION_XP\|/);
  });

  it("does not display Date: in the markup", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recSub1",
        reasonPublic: "Shooting submission completed with 250 shots.",
      }),
    ]);
    const html = renderLog(items);
    expect(html).not.toMatch(/Date:/);
    expect(html).toContain("2026-08-22");
  });

  it("shows XP only in the right column and leaves the middle column empty", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recSub2",
        points: 35,
        reasonPublic: "Shooting submission completed with 500 shots.",
      }),
    ]);
    const html = renderLog(items);
    expect(html).toContain("+35 XP");
    expect(html).toContain('data-testid="recent-activity-middle"');
    expect(html.match(/\+35 XP/g)?.length).toBe(1);
  });

  it("uses minmax grid columns to avoid horizontal overflow on small screens", () => {
    const html = renderLog(
      mapXpSummariesToPublicActivity([
        xpRow({
          id: "recSub3",
          reasonPublic: "Shooting submission completed with 1,250 shots.",
        }),
      ]),
    );
    expect(html).toContain("minmax(0,1fr)");
    expect(html).toContain("break-words");
  });

  it("does not repeat activity headings or XP amounts on the date row", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recSub4",
        reasonPublic: "Shooting submission completed with 900 shots.",
      }),
    ]);
    const html = renderLog(items);
    expect(html.match(/Shot Submission — 900 shots/g)?.length).toBe(1);
    expect(html.match(/\+20 XP/g)?.length).toBe(1);
  });

  it("formats zoom attendance with meeting name subline and date on the right", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recZoom1",
        points: 25,
        sourceLabel: "Zoom Attendance: Base",
        reasonPublic: "Attended live Zoom meeting.",
        zoomMeetingDisplayName: "Player Development Zoom",
      }),
    ]);
    const html = renderLog(items);

    expect(html).toContain("Zoom Meeting Attendance");
    expect(html).toContain("Player Development Zoom");
    expect(html).toContain("2026-08-22");
    expect(html).not.toMatch(/Zoom Attendance|Attended/i);
    expect(html).toContain('data-testid="recent-activity-subline"');
    expect(html.match(/\+25 XP/g)?.length).toBe(1);
    expect(html).toContain('data-testid="recent-activity-middle"');
  });

  it("shows Extra credit after the date on homework rows", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recHwEc",
        points: 160,
        sourceLabel: "Homework Completion",
        reasonPublic: "Homework completed.",
        homeworkAssignmentTitle: "Shot Tracker Usage",
        homeworkExtraCreditXp: 125,
      }),
    ]);
    const html = renderLog(items);

    expect(html).toContain("Homework Completed — Shot Tracker Usage");
    expect(html).toContain("+160 XP");
    expect(html).toContain("2026-08-22 · Extra credit +125 XP");
  });

  it("uses a safe fallback when zoom meeting display name is missing", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recZoom2",
        points: 10,
        sourceLabel: "Zoom Recording",
        reasonPublic: "Watched the Zoom recording.",
      }),
    ]);
    const html = renderLog(items);

    expect(html).toContain("Zoom Meeting Attendance");
    expect(html).toContain("Zoom meeting");
    expect(html).not.toContain("Attended via Recording");
  });
});

describe("XP Event Log sorting", () => {
  it("orders newest dates before older dates", () => {
    const sorted = sortXpEventsNewestFirst([
      xpRow({ id: "recOld", activityDate: "2026-08-01" }),
      xpRow({ id: "recNew", activityDate: "2026-08-22" }),
    ]);
    expect(sorted.map((row) => row.id)).toEqual(["recNew", "recOld"]);
  });

  it("uses reverse accomplishment order on the same date", () => {
    const sameDay: XpEventSummary[] = [
      xpRow({
        id: "recSub",
        sourceLabel: "Submission Base",
        reasonPublic: "Shooting submission completed with 1,250 shots.",
        points: 20,
        sortTimestamp: "2026-08-22T23:59:00.000Z",
      }),
      xpRow({
        id: "recMilestone125",
        sourceLabel: "Shot Milestone",
        reasonPublic: "Shot milestone reached: 125% milestone.",
        points: 40,
        sortTimestamp: "2026-08-22T06:00:00.000Z",
      }),
      xpRow({
        id: "recMilestone200",
        sourceLabel: "Shot Milestone",
        reasonPublic: "Shot milestone reached: 200% milestone.",
        points: 80,
        sortTimestamp: "2026-08-22T07:00:00.000Z",
      }),
      xpRow({
        id: "recWeekly100",
        sourceLabel: "Weekly Threshold 100",
        reasonPublic: "Reached 100% of weekly shot goal.",
        points: 10,
      }),
      xpRow({
        id: "recWeekly150",
        sourceLabel: "Weekly Threshold 150",
        reasonPublic: "Reached 150% of weekly shot goal.",
        points: 30,
      }),
      xpRow({
        id: "recBonus",
        sourceLabel: "Manual Bonus",
        reasonPublic: "Coach award",
        points: 25,
      }),
    ];

    const sorted = sortXpEventsNewestFirst(sameDay);
    expect(sorted.map((row) => row.id)).toEqual([
      "recBonus",
      "recWeekly150",
      "recWeekly100",
      "recMilestone200",
      "recMilestone125",
      "recSub",
    ]);
  });

  it("maps sorted summaries into public activity headlines", () => {
    const items = mapXpSummariesToPublicActivity(
      sortXpEventsNewestFirst([
        xpRow({
          id: "recHw",
          sourceLabel: "Homework Completion",
          reasonPublic: "Homework completed: Mikan Drill",
          points: 35,
        }),
        xpRow({
          id: "recWeekly125",
          sourceLabel: "Weekly Threshold 125",
          reasonPublic: "Reached 125% of weekly shot goal.",
          points: 20,
        }),
      ]),
    );

    expect(items[0].title).toBe("Homework Completed — Mikan Drill");
    expect(items[1].title).toBe("Weekly Shot Target — 125%");
    expect(items.every((item) => item.detail == null)).toBe(true);
  });
});
