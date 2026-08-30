import { describe, expect, it } from "vitest";

import {
  buildTutorialCatalogDisplay,
  getTutorialMediaDelivery,
  getTutorialMediaDeliveryLabel,
  isCrossProgramDribbleCandidate,
  isDribblingChallengeOnlyProgram,
} from "@/lib/data/tutorial-presentation";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";

function sampleItem(overrides: Partial<TutorialItem> = {}): TutorialItem {
  return {
    id: "recT1",
    name: "Form shooting",
    videoUrl: "https://youtu.be/abc123",
    athlete: "",
    athleteHeadshot: null,
    thumbnail: null,
    tutorialTypes: ["Tutorial"],
    categories: [],
    programs: ["Shooting Challenge"],
    briefDescription: "Short tip",
    detailedDescription: "",
    assignmentRationale: "",
    sortOrder: 1,
    ...overrides,
  };
}

describe("tutorial media delivery", () => {
  it("classifies in-page, external, and unavailable links", () => {
    expect(getTutorialMediaDelivery("https://youtu.be/abc123")).toBe("in-page");
    expect(getTutorialMediaDelivery("https://vimeo.com/123456789")).toBe("in-page");
    expect(getTutorialMediaDelivery("https://cdn.example.com/clip.mp4")).toBe("in-page");
    expect(getTutorialMediaDelivery("https://adobe.com/doc/123")).toBe("external");
    expect(getTutorialMediaDelivery("https://example.com/page")).toBe("external");
    expect(getTutorialMediaDelivery("")).toBe("unavailable");
  });

  it("labels delivery modes for parents", () => {
    expect(getTutorialMediaDeliveryLabel("in-page")).toBe("Watch in-page");
    expect(getTutorialMediaDeliveryLabel("external")).toBe("Open externally");
    expect(getTutorialMediaDeliveryLabel("unavailable")).toBe("Details available");
  });
});

describe("cross-program dribble audit (EXT-QA-003)", () => {
  it("detects dribbling-only and dual-tagged rows", () => {
    expect(isDribblingChallengeOnlyProgram(sampleItem({ programs: ["Dribbling Challenge"] }))).toBe(
      true,
    );
    expect(
      isCrossProgramDribbleCandidate(
        sampleItem({ programs: ["Shooting Challenge", "Dribbling Challenge"] }),
      ),
    ).toBe(true);
    expect(isCrossProgramDribbleCandidate(sampleItem({ programs: ["Shooting Challenge"] }))).toBe(
      false,
    );
  });

  it("hides dribbling-only rows and de-emphasizes dual-tagged rows", () => {
    const catalog: TutorialCatalogData = {
      categoryGroups: [
        {
          category: "More to explore",
          tutorials: [
            sampleItem({ id: "rec1", name: "Shoot form", programs: ["Shooting Challenge"] }),
            sampleItem({
              id: "rec2",
              name: "Crossover",
              programs: ["Shooting Challenge", "Dribbling Challenge"],
            }),
            sampleItem({ id: "rec3", name: "Handles", programs: ["Dribbling Challenge"] }),
          ],
        },
      ],
      totalTutorials: 3,
      updatedAt: "2026-08-30T00:00:00.000Z",
    };

    const display = buildTutorialCatalogDisplay(catalog);
    expect(display.totalTutorials).toBe(2);
    expect(display.hiddenCrossProgramCount).toBe(1);
    expect(display.groups.some((group) => group.deemphasized)).toBe(true);
    expect(
      display.groups.flatMap((group) => group.tutorials.map((item) => item.id)),
    ).toEqual(expect.arrayContaining(["rec1", "rec2"]));
    expect(
      display.groups.flatMap((group) => group.tutorials.map((item) => item.id)),
    ).not.toContain("rec3");
  });
});

describe("tutorial catalog display grouping", () => {
  it("groups uncategorized tutorials by media delivery", () => {
    const catalog: TutorialCatalogData = {
      categoryGroups: [
        {
          category: "More to explore",
          tutorials: [
            sampleItem({ id: "rec1", videoUrl: "https://youtu.be/a" }),
            sampleItem({ id: "rec2", videoUrl: "https://adobe.com/doc" }),
            sampleItem({ id: "rec3", videoUrl: "" }),
          ],
        },
      ],
      totalTutorials: 3,
      updatedAt: "2026-08-30T00:00:00.000Z",
    };

    const display = buildTutorialCatalogDisplay(catalog);
    expect(display.groups.map((group) => group.title)).toEqual([
      "Watch in-page",
      "Open externally",
      "Details available",
    ]);
  });

  it("preserves named skill categories when present", () => {
    const catalog: TutorialCatalogData = {
      categoryGroups: [
        {
          category: "Shoot",
          tutorials: [sampleItem({ id: "rec1", categories: ["Shoot"] })],
        },
        {
          category: "Character",
          tutorials: [sampleItem({ id: "rec2", categories: ["Character"] })],
        },
      ],
      totalTutorials: 2,
      updatedAt: "2026-08-30T00:00:00.000Z",
    };

    const display = buildTutorialCatalogDisplay(catalog);
    expect(display.groups.map((group) => group.title)).toEqual(["Shoot", "Character"]);
  });
});
