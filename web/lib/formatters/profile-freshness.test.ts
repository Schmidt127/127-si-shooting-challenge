import { describe, expect, it } from "vitest";

import { buildPublicAthleteProfile } from "@/lib/data/public-athlete-profile";
import {
  formatProfileFetchedAt,
  PROFILE_FRESHNESS_DEGRADED_MESSAGE,
  PROFILE_HOMEWORK_UNAVAILABLE_MESSAGE,
  resolvePublicActivityLedgerNotice,
  resolvePublicProfileMayBeStale,
} from "@/lib/formatters/profile-freshness";

describe("formatProfileFetchedAt", () => {
  it("formats a valid ISO timestamp", () => {
    const label = formatProfileFetchedAt("2026-08-25T18:00:00.000Z");
    expect(label).toMatch(/Aug/);
  });

  it("returns null for invalid timestamps", () => {
    expect(formatProfileFetchedAt("not-a-date")).toBeNull();
  });
});

describe("resolvePublicProfileMayBeStale", () => {
  it("returns false on clean loads", () => {
    expect(resolvePublicProfileMayBeStale({})).toBe(false);
    expect(resolvePublicProfileMayBeStale({ homeworkLoadFailed: false })).toBe(false);
  });

  it("returns true only when homework load failed", () => {
    expect(resolvePublicProfileMayBeStale({ homeworkLoadFailed: true })).toBe(true);
  });
});

describe("resolvePublicActivityLedgerNotice", () => {
  it("does not expose internal loader warnings or reconciliation notes", () => {
    expect(
      resolvePublicActivityLedgerNotice({
        loaderWarning:
          "XP Events → Enrollment Record ID is unavailable in this base; using Enrollment-linked XP Event IDs.",
        missingXpSubmissionCount: 3,
      }),
    ).toBeNull();
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

  it("does not mark mayBeStale for reconciliation-only ledger notices", () => {
    const profile = buildPublicAthleteProfile({
      slug: "test-athlete",
      fields: baseFields,
      rank: null,
      nextLevelName: null,
      recentActivity: [],
      weekly: [],
      achievements: [],
      activityLedgerNotice:
        "3 counted submission(s) are missing XP awards. Ops is reconciling.",
    });
    expect(profile.mayBeStale).toBe(false);
  });
});

describe("profile freshness copy", () => {
  it("uses parent-friendly wording without technical details", () => {
    expect(PROFILE_FRESHNESS_DEGRADED_MESSAGE).not.toMatch(/rec[a-zA-Z0-9]{14}/i);
    expect(PROFILE_FRESHNESS_DEGRADED_MESSAGE).not.toMatch(/Airtable/i);
    expect(PROFILE_HOMEWORK_UNAVAILABLE_MESSAGE).not.toMatch(/403/i);
    expect(PROFILE_HOMEWORK_UNAVAILABLE_MESSAGE).not.toMatch(/permission/i);
  });
});
