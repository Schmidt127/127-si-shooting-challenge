import { describe, expect, it } from "vitest";

import {
  getMockAthleteDashboard,
  weeklyShotPercent,
} from "@/lib/data/athlete-dashboard";
import { formatXpSourceLabel } from "@/lib/formatters";

describe("athlete-dashboard mock readiness", () => {
  it("uses homework CTA instead of fake daily submission route", () => {
    const dash = getMockAthleteDashboard();
    expect(dash.nextAction.href).toBe("/homework");
    expect(dash.nextAction.label.toLowerCase()).toContain("homework");
    expect(dash.nextAction.description.toLowerCase()).toContain("submission form");
  });

  it("does not link video feedback to tutorials", () => {
    const dash = getMockAthleteDashboard();
    expect(dash.feedback).not.toBeNull();
    expect(dash.feedback?.href).toBeUndefined();
  });

  it("exposes V2 XP source labels on recent events", () => {
    const dash = getMockAthleteDashboard();
    const labels = dash.recentXp.map((e) => formatXpSourceLabel(e.sourceLabel));
    expect(labels).toContain("Submission Base");
    expect(labels).toContain("Homework Completion");
    expect(labels).toContain("Zoom Attendance: Base");
    expect(labels).toContain("Zoom Recording");
    expect(labels).toContain("Video Submission");
    expect(labels).not.toContain("Video Feedback");
  });

  it("tracks season shots separately from XP", () => {
    const dash = getMockAthleteDashboard();
    expect(dash.seasonShots).toBeGreaterThan(0);
    expect(dash.seasonShots).not.toBe(dash.xp.total);
  });

  it("weeklyShotPercent handles bad goals", () => {
    expect(weeklyShotPercent(10, 0)).toBe(0);
    expect(weeklyShotPercent(Number.NaN, 100)).toBe(0);
    expect(weeklyShotPercent(50, 100)).toBe(50);
  });
});
