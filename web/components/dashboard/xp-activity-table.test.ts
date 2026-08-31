import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { XpActivityTable } from "@/components/dashboard/xp-activity-table";
import type { XpEventSummary } from "@/types/xp";

function row(overrides: Partial<XpEventSummary> = {}): XpEventSummary {
  return {
    id: "recDashboardXp01",
    points: 20,
    sourceLabel: "Submission Base",
    reasonPublic: "Shooting submission completed with 500 shots.",
    activityDate: "2026-08-22",
    ...overrides,
  };
}

describe("XpActivityTable", () => {
  it("uses the same two-row event layout as the athlete game log", () => {
    const html = renderToStaticMarkup(
      createElement(XpActivityTable, { rows: [row()] }),
    );

    expect(html).toContain("Shot Submission — 500 shots");
    expect(html).toContain("+20 XP");
    expect(html).toContain("2026-08-22");
    expect(html).not.toMatch(/Date:/);
    expect(html).toContain('data-testid="xp-activity-middle"');
    expect(html.match(/\+20 XP/g)?.length).toBe(1);
  });

  it("formats zoom attendance with meeting subline and date on the right", () => {
    const html = renderToStaticMarkup(
      createElement(XpActivityTable, {
        rows: [
          row({
            sourceLabel: "Zoom Attendance: Base",
            reasonPublic: "Attended live Zoom meeting.",
            points: 25,
            zoomMeetingDisplayName: "Player Development Zoom",
          }),
        ],
      }),
    );

    expect(html).toContain("Zoom Meeting Attendance");
    expect(html).toContain("Player Development Zoom");
    expect(html).toContain("2026-08-22");
    expect(html).not.toMatch(/Zoom Attendance|Attended/i);
    expect(html).toContain('data-testid="xp-activity-subline"');
    expect(html.match(/\+25 XP/g)?.length).toBe(1);
  });

  it("shows Extra credit after the date on homework rows", () => {
    const html = renderToStaticMarkup(
      createElement(XpActivityTable, {
        rows: [
          row({
            sourceLabel: "Homework Completion",
            reasonPublic: "Homework completed.",
            points: 160,
            homeworkAssignmentTitle: "Shot Tracker Usage",
            homeworkExtraCreditXp: 125,
          }),
        ],
      }),
    );

    expect(html).toContain("Homework Completed — Shot Tracker Usage");
    expect(html).toContain("+160 XP");
    expect(html).toContain("2026-08-22 · Extra credit +125 XP");
  });
});
