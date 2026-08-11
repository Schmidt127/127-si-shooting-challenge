import { describe, expect, it } from "vitest";

import { PUBLIC_DISPLAY_REFRESH_LABEL } from "./public-display-refresh";

describe("public display refresh affordance", () => {
  it("uses a clear accessible action label", () => {
    expect(PUBLIC_DISPLAY_REFRESH_LABEL).toBe("Refresh leaderboard");
  });
});
