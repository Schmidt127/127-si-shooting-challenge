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
  it("does not display Date: in the markup", () => {
    const items = mapXpSummariesToPublicActivity([
      xpRow({
        id: "recSub1",
        reasonPublic: "Shooting submission completed with 250 shots.",
      }),
    ]);
    const html = renderLog(items);
    expect(html).not.toMatch(/Date:/);
    expect(html).toContain("08/22/2026");
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
      }),
      xpRow({
        id: "recMilestone125",
        sourceLabel: "Shot Milestone",
        reasonPublic: "Shot milestone reached: 125% milestone.",
        points: 40,
      }),
      xpRow({
        id: "recMilestone200",
        sourceLabel: "Shot Milestone",
        reasonPublic: "Shot milestone reached: 200% milestone.",
        points: 80,
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
