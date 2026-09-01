import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LevelDetailView, LevelNotFoundState } from "@/components/levels/level-detail-view";
import { LEVEL_GATE_COPY } from "@/lib/release/public-surface";
import type { LevelDefinition } from "@/types/levels";

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
    nextLevelId: "",
    ...overrides,
  };
}

describe("LevelDetailView", () => {
  it("shows published gate criteria when configured", () => {
    const html = renderToStaticMarkup(
      createElement(LevelDetailView, {
        level: level({ gateCriteria: "Attend one Zoom session" }),
      }),
    );

    expect(html).toContain("Attend one Zoom session");
  });

  it("falls back gracefully when gate criteria are missing", () => {
    const html = renderToStaticMarkup(createElement(LevelDetailView, { level: level() }));

    expect(html).toContain(LEVEL_GATE_COPY.detailEmpty);
    expect(html).toContain('role="status"');
  });
});

describe("LevelNotFoundState", () => {
  it("renders a single h1 with graceful unavailable copy", () => {
    const html = renderToStaticMarkup(createElement(LevelNotFoundState));

    expect(html).toContain("<h1");
    expect(html).toContain(LEVEL_GATE_COPY.notFoundTitle);
    expect(html).toContain(LEVEL_GATE_COPY.notFoundDescription);
    expect(html).toContain('href="/levels"');
  });
});
