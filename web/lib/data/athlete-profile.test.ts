import { describe, expect, it } from "vitest";

import {
  DEMO_PROFILE_SLUGS,
  getMockAthleteProfile,
  loadAthleteProfile,
  loadAthleteProfileResult,
  normalizeProfileSlug,
} from "@/lib/data/athlete-profile";

describe("athlete-profile", () => {
  it("returns privacy-safe mock profile for a slug", () => {
    const profile = getMockAthleteProfile("jordan-reyes");
    expect(profile.athlete.slug).toBe("jordan-reyes");
    expect(profile.privacyNote.toLowerCase()).toContain("public");
    expect(JSON.stringify(profile).toLowerCase()).not.toMatch(/@/);
    expect(JSON.stringify(profile).toLowerCase()).not.toContain("parent email");
  });

  it("Schmidt demo slug remains visible and labelled mock", async () => {
    const result = await loadAthleteProfileResult("schmidt");
    expect(result.status).toBe("partial");
    if (result.status !== "partial") return;
    expect(result.data.athlete.displayName.toLowerCase()).toContain("schmidt");
    expect(result.data.source).toBe("mock");
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("normalizeProfileSlug cleans input", () => {
    expect(normalizeProfileSlug("  Demo Athlete!! ")).toBe("demo-athlete");
    expect(DEMO_PROFILE_SLUGS.has("demo-athlete")).toBe(true);
  });

  it("loadAthleteProfile rejects empty slug", async () => {
    await expect(loadAthleteProfile("")).resolves.toBeNull();
    const empty = await loadAthleteProfileResult("");
    expect(empty.status).toBe("not_found");
  });

  it("loadAthleteProfile returns mock for known demo slug", async () => {
    const profile = await loadAthleteProfile("Demo-Athlete");
    expect(profile?.athlete.slug).toBe("demo-athlete");
    expect(profile?.achievements.length).toBeGreaterThan(0);
  });

  it("unknown slug is missing_link (not fabricated athlete)", async () => {
    const result = await loadAthleteProfileResult("____not-a-real-athlete____");
    expect(result.status).toBe("missing_link");
    await expect(loadAthleteProfile("____not-a-real-athlete____")).resolves.toBeNull();
  });
});
