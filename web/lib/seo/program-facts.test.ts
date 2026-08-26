import { describe, expect, it } from "vitest";

import {
  HOME_HERO,
  HOME_PAGE_TITLE,
  IN_PERSON_SCOPE,
  PROGRAM_GRADES_SERVED,
  PROGRAM_HOME_LOCATION,
  SITE_DESCRIPTION,
} from "./program-facts";

describe("program SEO facts", () => {
  it("targets grades 1-8 youth basketball", () => {
    expect(PROGRAM_GRADES_SERVED).toBe("grades 1–8");
    expect(HOME_HERO.description).toMatch(/grades 1–8/i);
  });

  it("includes Educational Athletics and Fairfield Montana context", () => {
    expect(HOME_HERO.eyebrow).toMatch(/Educational Athletics/i);
    expect(HOME_HERO.description).toMatch(/Fairfield, Montana/i);
    expect(PROGRAM_HOME_LOCATION).toBe("Fairfield, Montana");
  });

  it("does not claim nationwide in-person services", () => {
    expect(IN_PERSON_SCOPE).toMatch(/Fairfield, Montana/i);
    expect(IN_PERSON_SCOPE).toMatch(/online/i);
    expect(IN_PERSON_SCOPE).not.toMatch(/nationwide in-person/i);
  });

  it("uses national-first homepage title and description", () => {
    expect(HOME_PAGE_TITLE).toMatch(/Youth Basketball/i);
    expect(SITE_DESCRIPTION).toMatch(/daily shooting practice/i);
    expect(SITE_DESCRIPTION).toMatch(/progress tracking/i);
  });
});
