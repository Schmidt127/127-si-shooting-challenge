import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const EXPLANATION_SOURCE = readFileSync(
  join(process.cwd(), "components/leaderboard/leaderboard-ranking-explanation.tsx"),
  "utf8",
);

describe("LeaderboardRankingExplanation content", () => {
  it("documents the three-step ranking order in plain language", () => {
    expect(EXPLANATION_SOURCE).toMatch(/Level.*XP.*Total Shots/s);
    expect(EXPLANATION_SOURCE).toMatch(/First, players are compared by Level/);
    expect(EXPLANATION_SOURCE).toMatch(/XP breaks the[\s\S]*tie/);
    expect(EXPLANATION_SOURCE).toMatch(/Total Shots determines the order/);
    expect(EXPLANATION_SOURCE).toMatch(/Higher values rank first/i);
  });
});
