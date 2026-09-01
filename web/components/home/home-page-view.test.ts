import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOME_SOURCE = readFileSync(
  join(process.cwd(), "components/home/home-page-view.tsx"),
  "utf8",
);

describe("Shooting Challenge home page layout", () => {
  it("places registration gateway immediately after the hero", () => {
    const heroIndex = HOME_SOURCE.indexOf("<PageHero");
    const registrationIndex = HOME_SOURCE.indexOf("<RegistrationGateway");
    const whatIsIndex = HOME_SOURCE.indexOf('eyebrow="What is the Shooting Challenge?"');
    expect(heroIndex).toBeGreaterThan(-1);
    expect(registrationIndex).toBeGreaterThan(heroIndex);
    expect(registrationIndex).toBeLessThan(whatIsIndex);
  });

  it("removes duplicate levels, leaderboard preview, and explore sections", () => {
    expect(HOME_SOURCE).not.toContain("LevelJourneySection");
    expect(HOME_SOURCE).not.toContain('eyebrow="Live leaders"');
    expect(HOME_SOURCE).not.toContain('eyebrow="Explore the challenge"');
  });
});
