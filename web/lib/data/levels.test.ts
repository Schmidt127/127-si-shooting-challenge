import { describe, expect, it } from "vitest";

import {
  buildLevelLadder,
  getLevelDisplayNumber,
  mapLevelRecord,
  summarizeGateCriteria,
} from "@/lib/data/levels";
import { buildTutorialCatalog, isShootingChallengeTutorial, mapTutorialRecord } from "@/lib/data/tutorials";

describe("level ladder", () => {
  it("orders levels ascending by sort order (Level 1 first)", () => {
    const ladder = buildLevelLadder([
      {
        id: "recL10",
        fields: { "Level Name": "Legend", "Sort Order": 10, "XP Required (Cumulative)": 5000 },
      },
      {
        id: "recL1",
        fields: { "Level Name": "Beginner", "Sort Order": 1, "XP Required (Cumulative)": 0 },
      },
    ]);

    expect(ladder.levels[0].name).toBe("Beginner");
    expect(ladder.levels[1].name).toBe("Legend");
    expect(ladder.maxXp).toBe(5000);
  });

  it("sorts numerically, not lexicographically", () => {
    const ladder = buildLevelLadder([
      { id: "recL11", fields: { "Level Name": "L11", "Sort Order": 11 } },
      { id: "recL2", fields: { "Level Name": "L2", "Sort Order": 2 } },
      { id: "recL10", fields: { "Level Name": "L10", "Sort Order": 10 } },
    ]);

    expect(ladder.levels.map((level) => level.sortOrder)).toEqual([2, 10, 11]);
  });

  it("exposes display numbers from sort order", () => {
    const level = mapLevelRecord({
      id: "recL3",
      fields: { "Level Name": "Hot Hand", "Sort Order": 3 },
    });

    expect(getLevelDisplayNumber(level)).toBe(3);
  });

  it("summarizes long gate criteria for cards", () => {
    const long = "A".repeat(140);
    expect(summarizeGateCriteria(long)).toHaveLength(120);
    expect(summarizeGateCriteria("")).toBe("");
    expect(summarizeGateCriteria("Zoom attendance required")).toBe("Zoom attendance required");
  });

  it("uses color display name when present", () => {
    const level = mapLevelRecord({
      id: "recL2",
      fields: { "Level Name": "Level 2", "Level Name with Color": "Hot Hand" },
    });

    expect(level.displayName).toBe("Hot Hand");
  });
});

describe("tutorial catalog", () => {
  it("groups tutorials without category into More to explore", () => {
    const catalog = buildTutorialCatalog([
      {
        id: "recT1",
        fields: {
          Name: "Form shooting",
          "Type of Asset": "Tutorial",
          "Sort Order": 1,
        },
      },
      {
        id: "recT2",
        fields: {
          Name: "Ball handling",
          "Type of Asset": "Tutorial",
          "Sort Order": 2,
        },
      },
    ]);

    expect(catalog.totalTutorials).toBe(2);
    expect(catalog.categoryGroups).toHaveLength(1);
    expect(catalog.categoryGroups[0].category).toBe("More to explore");
  });

  it("filters shooting challenge program", () => {
    expect(
      isShootingChallengeTutorial({
        "Associated Program": [{ name: "Shooting Challenge" }],
      }),
    ).toBe(true);
    expect(
      isShootingChallengeTutorial({
        "Associated Program": [{ name: "Dribbling Challenge" }],
      }),
    ).toBe(false);
  });

  it("maps tutorial video url", () => {
    const tutorial = mapTutorialRecord({
      id: "recT1",
      fields: { Name: "Clip", "Link to Video": "https://youtu.be/abc123" },
    });
    expect(tutorial.videoUrl).toContain("youtu.be");
  });
});
