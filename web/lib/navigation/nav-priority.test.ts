import { describe, expect, it } from "vitest";

import { SHOOTING_CHALLENGE_NAV } from "@/lib/navigation/shooting-challenge-nav";
import {
  MORE_NAV_HREFS,
  PRIMARY_NAV_HREFS,
  RESOURCES_NAV_HREFS,
  splitNavItems,
} from "@/lib/navigation/nav-priority";

describe("nav priority split", () => {
  it("keeps required primary links visible", () => {
    const { primary } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    expect(primary.map((item) => item.href)).toEqual([...PRIMARY_NAV_HREFS]);
  });

  it("places resource catalog routes under Resources", () => {
    const { resources } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    expect(resources.map((item) => item.href)).toEqual([...RESOURCES_NAV_HREFS]);
  });

  it("places secondary catalog routes under More", () => {
    const { more } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    for (const href of MORE_NAV_HREFS) {
      expect(more.some((item) => item.href === href)).toBe(true);
    }
  });

  it("excludes demo dashboard and gym display from the product nav list", () => {
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/dashboard")).toBe(false);
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/public-display")).toBe(false);
  });

  it("keeps FAQ and Game Manual in the More menu, not primary", () => {
    expect(PRIMARY_NAV_HREFS).not.toContain("/faq");
    expect(PRIMARY_NAV_HREFS).not.toContain("/game-manual");
    const { primary, more } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    expect(primary.some((item) => item.href === "/faq")).toBe(false);
    expect(primary.some((item) => item.href === "/game-manual")).toBe(false);
    expect(more.some((item) => item.href === "/faq")).toBe(true);
    expect(more.some((item) => item.href === "/game-manual")).toBe(true);
  });

  it("preserves every nav href across primary + resources + more", () => {
    const { primary, resources, more } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    const combined = new Set([...primary, ...resources, ...more].map((item) => item.href));
    for (const item of SHOOTING_CHALLENGE_NAV) {
      expect(combined.has(item.href)).toBe(true);
    }
  });
});
