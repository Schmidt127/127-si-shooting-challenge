import { describe, expect, it } from "vitest";

import { LEVELS_ORIENTATION_STEPS } from "./levels-orientation";

describe("levels orientation", () => {
  it("covers current level, next level, requirements, and advancement", () => {
    expect(LEVELS_ORIENTATION_STEPS).toHaveLength(4);

    const copy = LEVELS_ORIENTATION_STEPS.map((step) => `${step.title} ${step.description}`).join(
      " ",
    );

    expect(copy).toContain("current level");
    expect(copy).toContain("next level");
    expect(copy).toContain("requirements");
    expect(copy).toContain("XP");
  });

  it("keeps progression values sourced from the configured ladder", () => {
    expect(LEVELS_ORIENTATION_STEPS[2].description).toContain("program configuration");
    expect(LEVELS_ORIENTATION_STEPS[3].description).toContain("configured progression ladder");
  });
});
