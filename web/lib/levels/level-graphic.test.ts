import { describe, expect, it } from "vitest";

import {
  getLevelGraphicAltText,
  getLevelGraphicPlaceholderLabel,
  resolveLevelCoverImageUrl,
} from "@/lib/levels/level-graphic";

describe("level graphic helpers", () => {
  it("builds alt text from the level name", () => {
    expect(getLevelGraphicAltText("Beginner")).toBe("Beginner level emblem");
    expect(getLevelGraphicAltText("")).toBe("Athlete level emblem");
  });

  it("prefers permanent repo assets over expiring Airtable attachment URLs", () => {
    const ladder = [
      {
        displayName: "Beginner",
        name: "Beginner",
        coverImageUrl: "https://example.com/beginner.webp",
      },
    ];
    expect(
      resolveLevelCoverImageUrl("https://example.com/linked.webp", "Beginner", ladder),
    ).toBe("/shoot/images/levels/01_beginner.png");
  });

  it("falls back to ladder lookup by display name", () => {
    const ladder = [
      {
        displayName: "Rookie Shooter",
        name: "Rookie Shooter",
        sortOrder: 2,
        coverImageUrl: "https://example.com/rookie.webp",
      },
    ];
    expect(resolveLevelCoverImageUrl(null, "Rookie Shooter", ladder)).toBe(
      "/shoot/images/levels/02_rookie_shooter.png",
    );
  });

  it("returns null when no local cover is available", () => {
    expect(resolveLevelCoverImageUrl(null, "Unknown Tier", [])).toBeNull();
    expect(resolveLevelCoverImageUrl(undefined, null, undefined)).toBeNull();
  });

  it("maps placeholder labels through the level style ramp", () => {
    expect(getLevelGraphicPlaceholderLabel("Beginner")).toBe("BE");
    expect(getLevelGraphicPlaceholderLabel("Rookie Shooter")).toBe("RO");
    expect(getLevelGraphicPlaceholderLabel("G.O.A.T.")).toBe("G.");
  });
});
