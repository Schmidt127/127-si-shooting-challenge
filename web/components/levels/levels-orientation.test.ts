import { describe, expect, it } from "vitest";

import { LEVELS_ORIENTATION_STEPS, LEVELS_TERMINOLOGY } from "./levels-orientation";

describe("levels orientation", () => {
  it("covers current level, next level, requirements, and advancement", () => {
    expect(LEVELS_ORIENTATION_STEPS).toHaveLength(4);

    const copy = LEVELS_ORIENTATION_STEPS.map((step) => `${step.title} ${step.description}`).join(
      " ",
    );

    expect(copy).toContain("current level");
    expect(copy).toContain("next level");
    expect(copy).toContain("advance requirements");
    expect(copy).toContain("XP");
  });

  it("keeps progression values sourced from the configured ladder", () => {
    expect(LEVELS_ORIENTATION_STEPS[2].description).toContain("program configuration");
    expect(LEVELS_ORIENTATION_STEPS[3].description).toContain("source for the current path");
  });

  it("defines level, current level, next level, and gate terminology", () => {
    const terms = LEVELS_TERMINOLOGY.map((item) => item.term);
    expect(terms).toEqual(["Level", "Current level", "Next level", "Gate"]);
    expect(LEVELS_TERMINOLOGY[0].definition).toContain("Sort Order");
    expect(LEVELS_TERMINOLOGY[3].definition).toContain("lifetime XP");
  });
});
