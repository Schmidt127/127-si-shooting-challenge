import { describe, expect, it } from "vitest";

import { buildLevelLadder, mapLevelRecord } from "@/lib/data/levels";
import { buildTutorialCatalog, isShootingChallengeTutorial, mapTutorialRecord } from "@/lib/data/tutorials";

describe("level ladder", () => {
  it("orders levels highest sort order first", () => {
    const ladder = buildLevelLadder([
      {
        id: "recL1",
        fields: { "Level Name": "Beginner", "Sort Order": 1, "XP Required (Cumulative)": 0 },
      },
      {
        id: "recL10",
        fields: { "Level Name": "Legend", "Sort Order": 10, "XP Required (Cumulative)": 5000 },
      },
    ]);

    expect(ladder.levels[0].name).toBe("Legend");
    expect(ladder.maxXp).toBe(5000);
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
  it("groups tutorials by category", () => {
    const catalog = buildTutorialCatalog([
      {
        id: "recT1",
        fields: {
          Name: "Form shooting",
          "Tutorial - Category": ["Shoot"],
          "Sort Order": 1,
        },
      },
      {
        id: "recT2",
        fields: {
          Name: "Ball handling",
          "Tutorial - Category": ["Dribble"],
          "Sort Order": 2,
        },
      },
    ]);

    expect(catalog.totalTutorials).toBe(2);
    expect(catalog.categoryGroups).toHaveLength(2);
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
