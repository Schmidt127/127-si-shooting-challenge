import { describe, expect, it } from "vitest";

import {
  getLevelCoverAssetPath,
  getLevelCoverAssetSources,
  getLevelCoverAssetSrc,
  getLevelCoverWebpPath,
  resolveLevelCoverFileStem,
} from "@/lib/levels/level-cover-assets";

describe("level cover assets", () => {
  it("maps Airtable Level Name values to repo filenames", () => {
    expect(getLevelCoverAssetPath("Beginner")).toBe("/images/levels/01_beginner.png");
    expect(getLevelCoverAssetPath("Rookie Shooter")).toBe(
      "/images/levels/02_rookie_shooter.png",
    );
    expect(getLevelCoverAssetPath("Pro")).toBe("/images/levels/09_professional.png");
    expect(getLevelCoverAssetPath("G.O.A.T.")).toBe("/images/levels/12_goat.png");
  });

  it("exposes matching WebP derivatives beside PNG masters", () => {
    expect(getLevelCoverWebpPath("Beginner")).toBe("/images/levels/01_beginner.webp");
    const sources = getLevelCoverAssetSources("Beginner");
    expect(sources).toEqual({
      stem: "01_beginner",
      webp: "/shoot/images/levels/01_beginner.webp",
      png: "/shoot/images/levels/01_beginner.png",
    });
  });

  it("accepts slug-style Level Name values directly", () => {
    expect(getLevelCoverAssetPath("06_hot_hand")).toBe("/images/levels/06_hot_hand.png");
    expect(resolveLevelCoverFileStem("11_legend")).toBe("11_legend");
  });

  it("falls back to sort order when the name is unknown", () => {
    expect(getLevelCoverAssetPath("Unknown", 8)).toBe("/images/levels/08_sharpshooter.png");
  });

  it("prefixes basePath for Next.js static assets", () => {
    expect(getLevelCoverAssetSrc("Beginner")).toBe("/shoot/images/levels/01_beginner.png");
  });
});
