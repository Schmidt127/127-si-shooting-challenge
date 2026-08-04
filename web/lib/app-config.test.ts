import { describe, expect, it } from "vitest";

import { resolveLandingUrl, withBasePath } from "./app-config";

describe("resolveLandingUrl", () => {
  it("defaults to official fairfieldbasketballclub.com host", () => {
    expect(resolveLandingUrl("")).toBe("https://www.fairfieldbasketballclub.com");
    expect(resolveLandingUrl(null)).toBe("https://www.fairfieldbasketballclub.com");
  });

  it("normalizes FBC apex host to www", () => {
    expect(resolveLandingUrl("https://fairfieldbasketballclub.com")).toBe(
      "https://www.fairfieldbasketballclub.com",
    );
    expect(resolveLandingUrl("fairfieldbasketballclub.com")).toBe(
      "https://www.fairfieldbasketballclub.com",
    );
  });

  it("corrects the known hooop typo and bare hoopchallenges apex host", () => {
    expect(resolveLandingUrl("https://hooopchallenges.com")).toBe(
      "https://www.hoopchallenges.com",
    );
    expect(resolveLandingUrl("https://www.hooopchallenges.com/")).toBe(
      "https://www.hoopchallenges.com",
    );
    expect(resolveLandingUrl("hoopchallenges.com")).toBe("https://www.hoopchallenges.com");
  });

  it("preserves a valid custom landing URL path", () => {
    expect(resolveLandingUrl("https://www.fairfieldbasketballclub.com/programs")).toBe(
      "https://www.fairfieldbasketballclub.com/programs",
    );
  });
});

describe("withBasePath", () => {
  it("prefixes root-relative assets once", () => {
    expect(withBasePath("/favicon.png")).toBe("/shoot/favicon.png");
    expect(withBasePath("/shoot/favicon.png")).toBe("/shoot/favicon.png");
  });
});
