import { describe, expect, it } from "vitest";

import {
  CHALLENGE_DATES,
  CHALLENGE_SEASON_LABEL,
  HOME_HERO,
  HOME_PAGE_TITLE,
  IN_PERSON_SCOPE,
  PROGRAM_GRADES_SERVED,
  PROGRAM_HOME_LOCATION,
  PROGRAM_LEVEL_LADDER,
  SITE_DESCRIPTION,
} from "./program-facts";

describe("program SEO facts", () => {
  it("targets grades 1-12 youth basketball", () => {
    expect(PROGRAM_GRADES_SERVED).toBe("grades 1–12");
    expect(HOME_HERO.description).toMatch(/grades 1–12/i);
  });

  it("includes Educational Athletics and annual challenge context", () => {
    expect(HOME_HERO.eyebrow).toMatch(/Educational Athletics/i);
    expect(HOME_HERO.eyebrow).toMatch(/100% Online/i);
    expect(HOME_HERO.description).toMatch(/annual/i);
    expect(PROGRAM_HOME_LOCATION).toBe("Fairfield, Montana");
  });

  it("defines the current challenge season and dates", () => {
    expect(CHALLENGE_SEASON_LABEL).toBe("2026–2027 Shooting Challenge");
    expect(CHALLENGE_DATES).toBe("May 1–June 30");
    expect(HOME_HERO.factChips).toContain(CHALLENGE_DATES);
  });

  it("lists twelve public levels from Beginner to G.O.A.T.", () => {
    expect(PROGRAM_LEVEL_LADDER).toHaveLength(12);
    expect(PROGRAM_LEVEL_LADDER[0]).toBe("Beginner");
    expect(PROGRAM_LEVEL_LADDER[11]).toBe("G.O.A.T.");
  });

  it("does not claim nationwide in-person services", () => {
    expect(IN_PERSON_SCOPE).toMatch(/Fairfield, Montana/i);
    expect(IN_PERSON_SCOPE).toMatch(/online/i);
    expect(IN_PERSON_SCOPE).not.toMatch(/nationwide in-person/i);
  });

  it("uses XP-and-levels-first homepage title and description", () => {
    expect(HOME_PAGE_TITLE).toMatch(/Shooting Challenge/i);
    expect(HOME_PAGE_TITLE).toMatch(/12 Levels/i);
    expect(SITE_DESCRIPTION).toMatch(/Earn XP/i);
    expect(SITE_DESCRIPTION).toMatch(/grades 1–12/i);
    expect(SITE_DESCRIPTION).toMatch(/May 1–June 30/i);
  });
});
