import { describe, expect, it } from "vitest";

import { LEVELS_PROGRESS_INTRO, LEVELS_PROGRESS_POINTS } from "./levels-orientation";

describe("levels progress orientation", () => {
  it("frames current level, next level, and gates without a separate intro stack", () => {
    expect(LEVELS_PROGRESS_INTRO.toLowerCase()).toContain("current level");
    expect(LEVELS_PROGRESS_INTRO.toLowerCase()).toContain("next");
    expect(LEVELS_PROGRESS_INTRO).toMatch(/XP/i);

    const terms = LEVELS_PROGRESS_POINTS.map((item) => item.term);
    expect(terms).toEqual(["Current level", "Next level", "Gates"]);
  });

  it("points families at current and next gate details first", () => {
    expect(LEVELS_PROGRESS_POINTS[1].definition.toLowerCase()).toContain("gate");
    expect(LEVELS_PROGRESS_POINTS[2].definition).toMatch(/lifetime XP/i);
  });
});
