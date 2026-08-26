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
});
