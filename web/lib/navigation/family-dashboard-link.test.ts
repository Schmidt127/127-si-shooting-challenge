import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { withBasePath } from "@/lib/app-config";
import {
  FAMILY_DASHBOARD_APP_HREF,
  FAMILY_DASHBOARD_DESCRIPTION,
  FAMILY_DASHBOARD_LABEL,
  familyDashboardPublicPath,
} from "@/lib/navigation/family-dashboard-link";
import { SHOOTING_CHALLENGE_NAV } from "@/lib/navigation/shooting-challenge-nav";
import { FOOTER_QUICK_LINKS } from "@/lib/site-chrome/footer-config";

const FAQ_SOURCE = readFileSync(
  join(process.cwd(), "components/faq/faq-page-view.tsx"),
  "utf8",
);
describe("Family Dashboard public entry", () => {
  it("uses a basePath-relative app href, not a hardcoded /dashboard root", () => {
    expect(FAMILY_DASHBOARD_APP_HREF).toBe("/dashboard/sign-in");
    expect(FAMILY_DASHBOARD_APP_HREF).not.toBe("/dashboard");
  });

  it("resolves to /shoot/dashboard/sign-in with the default basePath", () => {
    expect(withBasePath(FAMILY_DASHBOARD_APP_HREF)).toBe("/shoot/dashboard/sign-in");
    expect(familyDashboardPublicPath()).toBe("/shoot/dashboard/sign-in");
    expect(familyDashboardPublicPath()).not.toBe("/dashboard/sign-in");
    expect(familyDashboardPublicPath()).not.toContain("/shoot/shoot");
  });

  it("keeps the public Family Dashboard label and supporting copy", () => {
    expect(FAMILY_DASHBOARD_LABEL).toBe("Family Dashboard");
    expect(FAMILY_DASHBOARD_DESCRIPTION).toMatch(/homework/i);
    expect(FAMILY_DASHBOARD_DESCRIPTION).toMatch(/video feedback/i);
    expect(FAMILY_DASHBOARD_DESCRIPTION).not.toMatch(/@/);
    expect(FAMILY_DASHBOARD_DESCRIPTION).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });

  it("is linked from the footer without exposing the private /dashboard data route", () => {
    expect(FOOTER_QUICK_LINKS.some((item) => item.href === FAMILY_DASHBOARD_APP_HREF)).toBe(
      true,
    );
    expect(FOOTER_QUICK_LINKS.some((item) => item.href === "/dashboard")).toBe(false);
    expect(FOOTER_QUICK_LINKS.some((item) => item.label === FAMILY_DASHBOARD_LABEL)).toBe(
      true,
    );
  });

  it("does not add the private dashboard route to the public product nav list", () => {
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/dashboard")).toBe(false);
    expect(SHOOTING_CHALLENGE_NAV.some((item) => item.href === "/public-display")).toBe(
      false,
    );
  });

  it("keeps FAQ get-started CTA wired to the shared public entry", () => {
    expect(FAQ_SOURCE).toContain("family-dashboard-faq-cta");
    expect(FAQ_SOURCE).toContain("FamilyDashboardLink");
  });
});
