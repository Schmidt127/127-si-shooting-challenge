import { describe, expect, it } from "vitest";

import {
  GAME_MANUAL_QUICK_START,
  GAME_MANUAL_QUICK_START_TITLE,
} from "./game-manual-quick-start";

describe("game manual quick start", () => {
  it("uses the requested rendered section title", () => {
    expect(GAME_MANUAL_QUICK_START_TITLE).toBe("Your first week at a glance");
  });

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
