import { describe, expect, it, vi } from "vitest";

import {
  loadAthleteProfile,
  loadAthleteProfileResult,
  normalizeProfileSlug,
} from "@/lib/data/athlete-profile";
import {
  buildPublicAthleteProfile,
  escapeAirtableString,
  isValidPublicSlug,
  mapShootingForTest,
} from "@/lib/data/public-athlete-profile";

// Re-export shooting via build to test percent nulls
import {
  asOptionalPercentRatio,
  asOptionalNumber,
} from "@/lib/data/airtable-values";

vi.mock("@/lib/airtable/queries", () => ({
  fetchPublicAthleteProfileBySlug: vi.fn(async (slug: string) => {
    if (slug === "testing-schmidt") {
      return buildPublicAthleteProfile({
        slug: "testing-schmidt",
        fields: {
          "Full Athlete Name": "Testing Schmidt",
          "School Name Lookup": "Test School",
          Grade: "8",
          "School Year": "2026-2027",
          "Public Profile Enabled": true,
          "Public Profile Slug": "testing-schmidt",
          "Active?": true,
          "Current Level - Public Facing Display": "Rookie Shooter",
          "Lifetime XP Total": 81,
          "Total Shots Counted": 100,
          "Total Submissions": 3,
          "Current Shooting Streak": 2,
          "Longest Streak Days": 5,
          "Overall FG %": null,
          "Total 2PT Attempted": null,
        },
        rank: 1,
        nextLevelName: "Developing Shooter",
        recentActivity: [],
        weekly: [],
        achievements: [],
      });
    }
    if (slug === "duplicate-slug") return null;
    return null;
  }),
}));

describe("athlete-profile loader", () => {
  it("normalizes slugs", () => {
    expect(normalizeProfileSlug(" Testing Schmidt ")).toBe("testing-schmidt");
    expect(isValidPublicSlug("testing-schmidt")).toBe(true);
    expect(isValidPublicSlug("recABCDEFGHIJKLMN")).toBe(false);
  });

  it("loads enabled profile", async () => {
    const result = await loadAthleteProfileResult("testing-schmidt");
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.identity.displayName).toBe("Testing Schmidt");
      expect(result.data.identity.slug).toBe("testing-schmidt");
      expect(JSON.stringify(result.data)).not.toMatch(/rec[a-zA-Z0-9]{14}/);
      expect(JSON.stringify(result.data)).not.toMatch(/@/);
    }
  });

  it("returns not_found for unknown slug", async () => {
    const result = await loadAthleteProfileResult("____not-a-real-athlete____");
    expect(result.status).toBe("not_found");
    await expect(loadAthleteProfile("____not-a-real-athlete____")).resolves.toBeNull();
  });

  it("rejects empty slug", async () => {
    await expect(loadAthleteProfile("")).resolves.toBeNull();
    const empty = await loadAthleteProfileResult("");
    expect(empty.status).toBe("not_found");
  });
});

describe("public profile mapping helpers", () => {
  it("escapes airtable strings", () => {
    expect(escapeAirtableString(`a"b\\c`)).toBe(`a\\"b\\\\c`);
  });

  it("keeps percent null when never recorded", () => {
    expect(asOptionalPercentRatio(null)).toBeNull();
    expect(asOptionalPercentRatio(undefined)).toBeNull();
    expect(asOptionalPercentRatio("")).toBeNull();
    expect(asOptionalNumber(null)).toBeNull();
    expect(asOptionalPercentRatio(0.42)).toBeCloseTo(0.42);
  });

  it("buildPublicAthleteProfile omits detailed percents when blank", () => {
    const profile = buildPublicAthleteProfile({
      slug: "minimal",
      fields: {
        "Full Athlete Name": "Minimal Athlete",
        "Lifetime XP Total": 10,
        "Total Shots Counted": 5,
      },
      rank: null,
      nextLevelName: null,
      recentActivity: [],
      weekly: [],
      achievements: [],
    });
    expect(profile.shooting.hasDetailedSplits).toBe(false);
    expect(profile.shooting.overallFg.percent).toBeNull();
    expect(profile.shooting.overallFg.available).toBe(false);
    expect(profile.identity.levelCoverImageUrl).toBeNull();
    expect(profile.progression.currentLevelCoverImageUrl).toBeNull();
  });

  it("buildPublicAthleteProfile maps Public Missing Homework/Zoom/Streak into missingRequirements", () => {
    const profile = buildPublicAthleteProfile({
      slug: "missing-gates",
      fields: {
        "Full Athlete Name": "Gate Athlete",
        "Public Missing Homework": "2 homework completions",
        "Public Missing Zoom": "1 zoom attendance",
        "Public Missing Streak": "3 more streak days",
        "Public Missing Submissions": "",
        "Public Missing Videos": "—",
      },
      rank: null,
      nextLevelName: null,
      recentActivity: [],
      weekly: [],
      achievements: [],
    });
    expect(profile.progression.missingRequirements).toEqual([
      "2 homework completions",
      "1 zoom attendance",
      "3 more streak days",
    ]);
  });

  it("buildPublicAthleteProfile carries current level cover URLs", () => {
    const profile = buildPublicAthleteProfile({
      slug: "with-cover",
      fields: {
        "Full Athlete Name": "Cover Athlete",
        "Current Level - Public Facing Display": "Beginner",
      },
      rank: null,
      nextLevelName: null,
      currentLevelCoverImageUrl: "https://example.com/beginner.webp",
      recentActivity: [],
      weekly: [],
      achievements: [],
    });
    expect(profile.identity.levelCoverImageUrl).toBe("https://example.com/beginner.webp");
    expect(profile.performance.currentLevelCoverImageUrl).toBe("https://example.com/beginner.webp");
    expect(profile.progression.currentLevelCoverImageUrl).toBe("https://example.com/beginner.webp");
  });
});

// silence unused if tree-shaken weirdly
void mapShootingForTest;
