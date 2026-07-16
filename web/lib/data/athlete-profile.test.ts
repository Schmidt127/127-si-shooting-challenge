import { describe, expect, it } from "vitest";

import { getMockAthleteProfile, loadAthleteProfile } from "@/lib/data/athlete-profile";

describe("athlete-profile", () => {
  it("returns privacy-safe mock profile for a slug", () => {
    const profile = getMockAthleteProfile("jordan-reyes");
    expect(profile.athlete.slug).toBe("jordan-reyes");
    expect(profile.privacyNote.toLowerCase()).toContain("public");
    expect(JSON.stringify(profile).toLowerCase()).not.toContain("@");
  });

  it("does not label season shots as XP", () => {
    const profile = getMockAthleteProfile("demo-athlete");
    const seasonShots = profile.milestones.find((m) => m.label === "Season shots");
    expect(seasonShots?.value.toLowerCase()).toContain("counted");
    expect(seasonShots?.value.toLowerCase()).not.toContain("xp");
  });

  it("keeps coach feedback activity without a misleading tutorials link", () => {
    const profile = getMockAthleteProfile("demo-athlete");
    const feedback = profile.recentActivity.find((a) => a.title === "Coach feedback");
    expect(feedback?.href).toBeUndefined();
  });

  it("loadAthleteProfile rejects empty slug", async () => {
    await expect(loadAthleteProfile("")).resolves.toBeNull();
  });

  it("loadAthleteProfile returns mock for known slug", async () => {
    const profile = await loadAthleteProfile("Demo-Athlete");
    expect(profile?.athlete.slug).toBe("demo-athlete");
    expect(profile?.achievements.length).toBeGreaterThan(0);
    expect(profile?.recentXp.length).toBeGreaterThan(0);
  });
});
