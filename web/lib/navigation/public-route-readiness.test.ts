import { describe, expect, it } from "vitest";

import { SITEMAP_PUBLIC_ROUTES } from "@/lib/seo/metadata";
import {
  FAMILY_FACING_SMOKE_PATHS,
  PUBLIC_CHROME_EXCLUDED_ROUTES,
} from "@/lib/release/public-surface";
import { FOOTER_QUICK_LINKS } from "@/lib/site-chrome/footer-config";
import { PUBLIC_SMOKE_ROUTES } from "../../tests/helpers/smoke";

import { PROGRAM_HUB_LINKS } from "./program-hub-links";
import { SHOOTING_CHALLENGE_NAV } from "./shooting-challenge-nav";

describe("public route readiness — family chrome", () => {
  for (const href of PUBLIC_CHROME_EXCLUDED_ROUTES) {
    it(`keeps ${href} out of product nav, hub cards, and footer`, () => {
      expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === href)).toBe(false);
      expect(PROGRAM_HUB_LINKS.some((item) => item.href === href)).toBe(false);
      expect(FOOTER_QUICK_LINKS.some((item) => item.href === href)).toBe(false);
    });
  }

  it("includes FAQ in nav, sitemap, and family smoke paths", () => {
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/faq")).toBe(true);
    expect(SITEMAP_PUBLIC_ROUTES).toContain("/faq");
    expect(FAMILY_FACING_SMOKE_PATHS).toContain("faq");
    expect(PUBLIC_SMOKE_ROUTES.some((route) => route.path === "faq")).toBe(true);
  });

  it("includes Family Dashboard sign-in in family smoke without adding private /dashboard to catalog nav", () => {
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/dashboard")).toBe(false);
    expect(FOOTER_QUICK_LINKS.some((item) => item.href === "/dashboard/sign-in")).toBe(true);
    expect(FAMILY_FACING_SMOKE_PATHS).toContain("dashboard/sign-in");
    expect(PUBLIC_SMOKE_ROUTES.some((route) => route.path === "dashboard/sign-in")).toBe(
      true,
    );
    expect(SITEMAP_PUBLIC_ROUTES).not.toContain("/dashboard/sign-in");
  });

  it("covers every family-facing smoke path in Playwright smoke routes", () => {
    const smokePaths = new Set(
      PUBLIC_SMOKE_ROUTES.map((route) => route.path).filter((path) => path !== "admin"),
    );
    for (const path of FAMILY_FACING_SMOKE_PATHS) {
      expect(smokePaths.has(path), `missing smoke route for ${path}`).toBe(true);
    }
  });

  it("keeps operator-only routes reachable in smoke but out of family chrome lists", () => {
    const smokePaths = PUBLIC_SMOKE_ROUTES.map((route) => route.path);
    expect(smokePaths).toContain("dashboard");
    expect(smokePaths).toContain("public-display");
    for (const href of PUBLIC_CHROME_EXCLUDED_ROUTES) {
      expect(FAMILY_FACING_SMOKE_PATHS).not.toContain(href.replace(/^\//, ""));
    }
  });
});
