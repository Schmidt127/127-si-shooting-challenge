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

  it("prefers the linked cover URL over ladder lookup", () => {
    const ladder = [
      {
        displayName: "Beginner",
        name: "Beginner",
        coverImageUrl: "https://example.com/beginner.webp",
      },
    ];
    expect(
      resolveLevelCoverImageUrl("https://example.com/linked.webp", "Beginner", ladder),
    ).toBe("https://example.com/linked.webp");
  });

  it("falls back to ladder lookup by display name", () => {
    const ladder = [
      {
        displayName: "Rookie Shooter",
        name: "Rookie",
        coverImageUrl: "https://example.com/rookie.webp",
      },
    ];
    expect(resolveLevelCoverImageUrl(null, "Rookie Shooter", ladder)).toBe(
      "https://example.com/rookie.webp",
    );
    expect(resolveLevelCoverImageUrl("", "Rookie", ladder)).toBe(
      "https://example.com/rookie.webp",
    );
  });

  it("returns null when no cover is available", () => {
    expect(resolveLevelCoverImageUrl(null, "Unknown Tier", [])).toBeNull();
    expect(resolveLevelCoverImageUrl(undefined, null, undefined)).toBeNull();
  });

  it("maps placeholder labels through the level style ramp", () => {
    expect(getLevelGraphicPlaceholderLabel("Beginner")).toBe("BE");
    expect(getLevelGraphicPlaceholderLabel("Rookie Shooter")).toBe("RO");
    expect(getLevelGraphicPlaceholderLabel("G.O.A.T.")).toBe("G.");
    expect(getLevelGraphicPlaceholderLabel("")).toBe("—");
    expect(getLevelGraphicPlaceholderLabel("Unknown", 7)).toBe("7");
  });

  it("never emits the ambiguous LV abbreviation", () => {
    expect(getLevelGraphicPlaceholderLabel("")).not.toBe("LV");
    expect(getLevelGraphicPlaceholderLabel("Unranked")).not.toBe("LV");
  });
});
