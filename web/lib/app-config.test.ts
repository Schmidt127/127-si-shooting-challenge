import { describe, expect, it } from "vitest";

import { resolveLandingUrl, withBasePath } from "./app-config";

describe("resolveLandingUrl", () => {
  it("defaults to www hoopchallenges hub", () => {
    expect(resolveLandingUrl("")).toBe("https://www.hoopchallenges.com");
    expect(resolveLandingUrl(null)).toBe("https://www.hoopchallenges.com");
  });

  it("corrects the known hooop typo and bare apex host", () => {
    expect(resolveLandingUrl("https://hooopchallenges.com")).toBe(
      "https://www.hoopchallenges.com",
    );
    expect(resolveLandingUrl("https://www.hooopchallenges.com/")).toBe(
      "https://www.hoopchallenges.com",
    );
    expect(resolveLandingUrl("hoopchallenges.com")).toBe("https://www.hoopchallenges.com");
  });

  it("preserves a valid custom landing URL", () => {
    expect(resolveLandingUrl("https://www.hoopchallenges.com/programs")).toBe(
      "https://www.hoopchallenges.com/programs",
    );
  });
});

describe("withBasePath", () => {
  it("prefixes root-relative assets once", () => {
    expect(withBasePath("/favicon.png")).toBe("/shoot/favicon.png");
    expect(withBasePath("/shoot/favicon.png")).toBe("/shoot/favicon.png");
  });
});
