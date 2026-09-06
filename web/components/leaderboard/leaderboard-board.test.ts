import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BOARD_SOURCE = readFileSync(
  join(process.cwd(), "components/leaderboard/leaderboard-board.tsx"),
  "utf8",
);

describe("LeaderboardBoard band query sync", () => {
  it("syncs initialBandId into band state when the prop changes", () => {
    expect(BOARD_SOURCE).toContain("useEffect");
    expect(BOARD_SOURCE).toContain(
      "setBand(resolveSelectedGradeBandId(initialBandId, options))",
    );
    expect(BOARD_SOURCE).toMatch(
      /useEffect\(\(\) => \{[\s\S]*initialBandId[\s\S]*\}, \[initialBandId, options\]\)/,
    );
  });

  it("still seeds band state from initialBandId on first render", () => {
    expect(BOARD_SOURCE).toMatch(
      /useState\(\(\) =>\s*resolveSelectedGradeBandId\(initialBandId, options\),?\s*\)/,
    );
  });
});
