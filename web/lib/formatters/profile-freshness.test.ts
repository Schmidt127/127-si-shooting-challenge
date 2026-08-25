import { describe, expect, it } from "vitest";

import { formatProfileFetchedAt } from "@/lib/formatters/profile-freshness";
import { buildPublicAthleteProfile } from "@/lib/data/public-athlete-profile";

describe("formatProfileFetchedAt", () => {
  it("formats a valid ISO timestamp", () => {
    const label = formatProfileFetchedAt("2026-08-25T18:00:00.000Z");
    expect(label).toMatch(/Aug/);
  });

  it("returns null for invalid timestamps", () => {
    expect(formatProfileFetchedAt("not-a-date")).toBeNull();
  });
});

describe("buildPublicAthleteProfile mayBeStale", () => {
  const baseFields = {
    "Full Athlete Name": "Test Athlete",
    "School Year": "2026",
    "Total Shots Counted": 100,
    "Lifetime XP Total": 50,
    "Current Shooting Streak": 1,
    "Longest Streak Days": 2,
    "Total Submissions": 3,
  };

  it("defaults mayBeStale to false on clean loads", () => {
    const profile = buildPublicAthleteProfile({
      slug: "test-athlete",
      fields: baseFields,
      rank: null,
      nextLevelName: null,
      recentActivity: [],
      weekly: [],
      achievements: [],
    });
    expect(profile.mayBeStale).toBe(false);
  });

  it("marks mayBeStale when homework load failed", () => {
    const profile = buildPublicAthleteProfile({
      slug: "test-athlete",
      fields: baseFields,
      rank: null,
      nextLevelName: null,
      recentActivity: [],
      weekly: [],
      achievements: [],
      homeworkLoadFailed: true,
    });
    expect(profile.mayBeStale).toBe(true);
  });
});
