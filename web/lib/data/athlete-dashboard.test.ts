import { describe, expect, it } from "vitest";

import {
  getMockAthleteDashboard,
  loadAthleteDashboard,
  weeklyShotPercent,
} from "@/lib/data/athlete-dashboard";
import { PRIVATE_DASHBOARD_ENROLLMENT_FIELDS } from "@/lib/data/private-dashboard-loader";
import { formatXpSourceLabel } from "@/lib/formatters";

describe("athlete-dashboard mock readiness", () => {
  it("uses homework CTA instead of fake daily submission route", () => {
    const dash = getMockAthleteDashboard();
    expect(dash.nextAction.href).toBe("/homework");
    expect(dash.nextAction.label.toLowerCase()).toContain("homework");
    expect(dash.nextAction.description.toLowerCase()).toContain("submission form");
  });

  it("includes structured homework rows for the private dashboard", () => {
    const dash = getMockAthleteDashboard();
    expect(dash.homework.length).toBeGreaterThan(0);
    expect(dash.homework[0]?.key).not.toMatch(/^rec/);
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

  it("rejects enrollmentId URL params until SC-112 athlete auth", () => {
    expect(() =>
      loadAthleteDashboard({ enrollmentId: "recABCDEFGHIJKLMN" }),
    ).toThrow(/SC-112/i);
  });

  it("serializes mock dashboard without Airtable record ids", () => {
    const serialized = JSON.stringify(getMockAthleteDashboard());
    expect(serialized).not.toMatch(/\brec[a-zA-Z0-9]{14}\b/);
  });
});

describe("PRIVATE_DASHBOARD_ENROLLMENT_FIELDS allowlist", () => {
  const forbidden = [/parent email/i, /phone/i, /stripe/i, /fillout submission id/i, /reason debug/i];

  it("excludes contact and internal reconciliation fields", () => {
    for (const field of PRIVATE_DASHBOARD_ENROLLMENT_FIELDS) {
      for (const pattern of forbidden) {
        expect(field, `forbidden field: ${field}`).not.toMatch(pattern);
      }
    }
  });
});
