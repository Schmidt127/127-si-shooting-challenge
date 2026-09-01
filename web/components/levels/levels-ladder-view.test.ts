import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  LevelsEmptyState,
  LevelsErrorState,
  LevelsLadderView,
} from "@/components/levels/levels-ladder-view";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { LevelDefinition, LevelLadderData } from "@/types/levels";

function level(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: "recL000000000001",
    name: "Beginner",
    displayName: "Beginner",
    sortOrder: 1,
    rank: 1,
    xpRequired: 0,
    xpFromPrevious: 0,
    coverImage: null,
    gateCriteria: "",
    previousLevelId: "",
    nextLevelId: "recL000000000002",
    ...overrides,
  };
}

function ladder(levels: LevelDefinition[]): LevelLadderData {
  const maxXp = levels.reduce((max, item) => Math.max(max, item.xpRequired), 0);
  return {
    levels,
    totalLevels: levels.length,
    maxXp,
    updatedAt: "2026-08-26T12:00:00.000Z",
  };
}

function buildTwelveLevels(): LevelDefinition[] {
  return Array.from({ length: 12 }, (_, index) => {
    const step = index + 1;
    const prevId = index > 0 ? `recL${String(index).padStart(14, "0")}` : "";
    const nextId = index < 11 ? `recL${String(index + 2).padStart(14, "0")}` : "";
    return level({
      id: `recL${String(step).padStart(14, "0")}`,
      name: `Level ${step}`,
      displayName: `Level ${step}`,
      sortOrder: step,
      rank: step,
      xpRequired: step * 100,
      xpFromPrevious: step === 1 ? 0 : 100,
      gateCriteria: step % 3 === 0 ? `Gate for level ${step}` : "",
      previousLevelId: prevId,
      nextLevelId: nextId,
    });
  });
}

describe("LevelsLadderView", () => {
  it("renders all twelve levels in ascending numeric order", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, { data: ladder(buildTwelveLevels()) }),
    );

    expect(html.match(/data-testid="levels-ladder-card"/g)?.length).toBe(12);
    expect(html).toContain('data-level-number="1"');
    expect(html).toContain('data-level-number="12"');

    const numbers = [...html.matchAll(/data-level-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("does not sort levels lexicographically", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, {
        data: ladder([
          level({ id: "recA", name: "Ten", sortOrder: 10, rank: 10 }),
          level({ id: "recB", name: "Two", sortOrder: 2, rank: 2 }),
          level({ id: "recC", name: "Eleven", sortOrder: 11, rank: 11 }),
        ]),
      }),
    );

    const numbers = [...html.matchAll(/data-level-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(numbers).toEqual([2, 10, 11]);
  });

  it("labels the level number clearly instead of an unexplained LV abbreviation", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, { data: ladder([level({ sortOrder: 4, name: "Hot Hand" })]) }),
    );

    expect(html).toContain(">Level<");
    expect(html).toContain('aria-label="Level 4"');
    expect(html).not.toContain(">LV<");
  });

  it("shows gate requirements from configured data with a safe fallback", () => {
    const withGate = renderToStaticMarkup(
      createElement(LevelsLadderView, {
        data: ladder([level({ gateCriteria: "Attend one Zoom session" })]),
      }),
    );
    const withoutGate = renderToStaticMarkup(
      createElement(LevelsLadderView, {
        data: ladder([level({ gateCriteria: "" })]),
      }),
    );

    expect(withGate).toContain("Attend one Zoom session");
    expect(withoutGate).toContain("No extra gates");
  });

  it("names the next level on each card", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, {
        data: ladder([
          level({ id: "rec1", name: "Beginner", nextLevelId: "rec2" }),
          level({ id: "rec2", name: "Rookie", sortOrder: 2, rank: 2, previousLevelId: "rec1" }),
        ]),
      }),
    );

    expect(html).toContain("Next level:");
    expect(html).toContain("Rookie");
    expect(html).toContain("Top of the ladder");
  });

  it("includes the decorative ladder hero background", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, { data: ladder([level()]) }),
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/bg-brand-blue\/1[04]/);
  });

  it("explains current level, next level, gate, and level terminology", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, { data: ladder([level()]) }),
    );

    expect(html).toContain('data-testid="levels-terminology"');
    expect(html).toContain("Current level");
    expect(html).toContain("Next level");
    expect(html).toContain("Gate");
    expect(html).toContain("ascending order");
  });

  it("does not duplicate level cards", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsLadderView, {
        data: ladder([
          level({ id: "recDup", name: "Only Level", sortOrder: 1 }),
        ]),
      }),
    );

    expect(html.match(/data-testid="levels-ladder-card"/g)?.length).toBe(1);
  });
});

describe("Levels page states", () => {
  it("renders the empty state shell", () => {
    const html = renderToStaticMarkup(createElement(LevelsEmptyState));
    expect(html).toContain("level ladder");
    expect(html).toContain(EMPTY_STATE_COPY.levels.title);
  });

  it("renders the error state shell", () => {
    const html = renderToStaticMarkup(
      createElement(LevelsErrorState, { message: "Airtable unavailable" }),
    );
    expect(html).toContain("Could not load levels");
    expect(html).toContain("Airtable unavailable");
  });
});
