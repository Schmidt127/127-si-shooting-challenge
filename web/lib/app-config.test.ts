import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PUBLIC_LANDING_ORIGIN,
  PUBLIC_SITE_ORIGIN,
  resolveLandingUrl,
  resolveSiteUrl,
  withBasePath,
} from "./app-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public origins", () => {
  it("defaults to Fairfield Basketball Club, not Hoop Challenges", () => {
    expect(PUBLIC_LANDING_ORIGIN).toBe("https://www.fairfieldbasketballclub.com");
    expect(PUBLIC_SITE_ORIGIN).toBe("https://www.fairfieldbasketballclub.com/shoot");
    expect(PUBLIC_LANDING_ORIGIN).not.toMatch(/hoopchallenges/i);
    expect(PUBLIC_SITE_ORIGIN).not.toMatch(/hoopchallenges/i);
  });
});

describe("resolveLandingUrl", () => {
  it("defaults to official Fairfield landing when env is missing or blank", () => {
    expect(resolveLandingUrl("")).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl(null)).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl(undefined)).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl("   ")).toBe(PUBLIC_LANDING_ORIGIN);
  });

  it("resolves safely when the value is malformed", () => {
    expect(resolveLandingUrl("not a url")).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl("://broken")).toBe(PUBLIC_LANDING_ORIGIN);
  });

  it("rewrites legacy Hoop Challenges hosts (including hooop typo) to Fairfield", () => {
    expect(resolveLandingUrl("https://hooopchallenges.com")).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl("https://www.hooopchallenges.com/")).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl("hoopchallenges.com")).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl("https://www.hoopchallenges.com")).toBe(PUBLIC_LANDING_ORIGIN);
    expect(resolveLandingUrl("https://www.hoopchallenges.com/programs")).toBe(
      "https://www.fairfieldbasketballclub.com/programs",
    );
  });

  it("canonicalizes bare fairfieldbasketballclub.com to www", () => {
    expect(resolveLandingUrl("https://fairfieldbasketballclub.com")).toBe(
      PUBLIC_LANDING_ORIGIN,
    );
    expect(resolveLandingUrl("fairfieldbasketballclub.com/programs")).toBe(
      "https://www.fairfieldbasketballclub.com/programs",
    );
  });

  it("preserves a valid Fairfield landing path", () => {
    expect(resolveLandingUrl("https://www.fairfieldbasketballclub.com/programs")).toBe(
      "https://www.fairfieldbasketballclub.com/programs",
    );
  });

  it("never returns a Hoop Challenges host", () => {
    const samples = [
      "",
      null,
      "https://www.hoopchallenges.com",
      "https://hooopchallenges.com/foo",
      "not-a-url",
      "https://www.fairfieldbasketballclub.com",
    ];
    for (const sample of samples) {
      expect(resolveLandingUrl(sample)).not.toMatch(/hoopchallenges/i);
    }
  });
});

describe("resolveSiteUrl", () => {
  it("defaults to Fairfield /shoot for metadata", () => {
    expect(resolveSiteUrl("")).toBe(PUBLIC_SITE_ORIGIN);
    expect(resolveSiteUrl(null)).toBe(PUBLIC_SITE_ORIGIN);
    expect(resolveSiteUrl(undefined, "/shoot")).toBe(PUBLIC_SITE_ORIGIN);
  });

  it("rewrites legacy Hoop Challenges site URLs to Fairfield /shoot", () => {
    expect(resolveSiteUrl("https://www.hoopchallenges.com/shoot")).toBe(PUBLIC_SITE_ORIGIN);
    expect(resolveSiteUrl("https://hooopchallenges.com")).toBe(PUBLIC_SITE_ORIGIN);
    expect(resolveSiteUrl("hoopchallenges.com/shoot")).toBe(PUBLIC_SITE_ORIGIN);
  });

  it("resolves safely when malformed", () => {
    expect(resolveSiteUrl("::::")).toBe(PUBLIC_SITE_ORIGIN);
  });

  it("keeps /shoot application path intact on Fairfield host", () => {
    expect(resolveSiteUrl("https://www.fairfieldbasketballclub.com/shoot")).toBe(
      PUBLIC_SITE_ORIGIN,
    );
    expect(resolveSiteUrl("https://fairfieldbasketballclub.com/shoot/")).toBe(
      PUBLIC_SITE_ORIGIN,
    );
  });
});

describe("withBasePath", () => {
  it("prefixes root-relative assets once and keeps /shoot intact", () => {
    expect(withBasePath("/favicon.png")).toBe("/shoot/favicon.png");
    expect(withBasePath("/shoot/favicon.png")).toBe("/shoot/favicon.png");
    expect(withBasePath("/leaderboard")).toBe("/shoot/leaderboard");
  });
});

describe("module exports with legacy Vercel env values", () => {
  it("LANDING_URL and SITE_URL self-heal hooopchallenges.com at import time", async () => {
    vi.stubEnv("NEXT_PUBLIC_LANDING_URL", "https://hooopchallenges.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.hooopchallenges.com/shoot");
    vi.resetModules();

    const config = await import("./app-config");

    expect(config.LANDING_URL).toBe(PUBLIC_LANDING_ORIGIN);
    expect(config.SITE_URL).toBe(PUBLIC_SITE_ORIGIN);
    expect(config.LANDING_URL).not.toMatch(/hoopchallenges/i);
    expect(config.SITE_URL).not.toMatch(/hoopchallenges/i);
  });
});
