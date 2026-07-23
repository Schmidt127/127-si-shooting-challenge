import { describe, expect, it } from "vitest";

import { SHOOTING_CHALLENGE_NAV } from "@/lib/navigation/shooting-challenge-nav";
import {
  MORE_NAV_HREFS,
  PRIMARY_NAV_HREFS,
  splitNavItems,
} from "@/lib/navigation/nav-priority";

describe("nav priority split", () => {
  it("keeps required primary links visible", () => {
    const { primary } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    expect(primary.map((item) => item.href)).toEqual([...PRIMARY_NAV_HREFS]);
  });

  it("places secondary catalog routes under More", () => {
    const { more } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    for (const href of MORE_NAV_HREFS) {
      expect(more.some((item) => item.href === href)).toBe(true);
    }
  });

  it("preserves every nav href across primary + more", () => {
    const { primary, more } = splitNavItems(SHOOTING_CHALLENGE_NAV);
    const combined = new Set([...primary, ...more].map((item) => item.href));
    for (const item of SHOOTING_CHALLENGE_NAV) {
      expect(combined.has(item.href)).toBe(true);
    }
  });
});
