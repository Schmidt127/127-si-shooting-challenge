import { describe, expect, it } from "vitest";

import { GAME_MANUAL_QUICK_START } from "./game-manual-view";

describe("game manual quick start", () => {
  it("provides three ordered, user-facing progression steps", () => {
    expect(GAME_MANUAL_QUICK_START).toHaveLength(3);
    expect(GAME_MANUAL_QUICK_START.map((step) => step.title)).toEqual([
      "Start with the shot goal",
      "Build the full athlete profile",
      "Check the next gate",
    ]);
  });

  it("explains both XP and activity requirements without claiming live data", () => {
    const copy = GAME_MANUAL_QUICK_START.map((step) => step.description).join(" ");

    expect(copy).toContain("XP");
    expect(copy).toContain("Homework");
    expect(copy).toContain("level details");
  });
});
