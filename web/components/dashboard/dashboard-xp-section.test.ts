import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardXpSection } from "@/components/dashboard/dashboard-xp-section";
import { PRIVATE_GAME_LOG_CATEGORY_OPTIONS } from "@/lib/data/game-log-categories";
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

describe("DashboardXpSection category filters", () => {
  it("renders the nine private category chips plus All", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardXpSection, {
        rows: [
          row(),
          row({ id: "recHw", sourceLabel: "Homework Completion", reasonPublic: "Homework completed." }),
        ],
      }),
    );

    expect(html).toContain('data-testid="private-game-log-category-toolbar"');
    expect(html).toContain('data-testid="game-log-filter-all"');
    for (const option of PRIVATE_GAME_LOG_CATEGORY_OPTIONS) {
      expect(html).toContain(`data-testid="game-log-filter-${option.id}"`);
      expect(html).toContain(option.label);
    }
    expect(html).not.toMatch(/rec[A-Za-z0-9]{14}/);
    expect(html).not.toMatch(/SUBMISSION_XP\|/);
  });

  it("keeps horizontal scroll support for mobile chip overflow", () => {
    const html = renderToStaticMarkup(createElement(DashboardXpSection, { rows: [row()] }));
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("min-h-10");
  });
});
