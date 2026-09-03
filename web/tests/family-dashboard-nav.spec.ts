import { expect, test } from "@playwright/test";

import { openMobileNavPanel } from "./helpers/smoke";
import {
  FAMILY_DASHBOARD_LABEL,
  familyDashboardPublicPath,
} from "../lib/navigation/family-dashboard-link";

const FAMILY_DASHBOARD_HREF = familyDashboardPublicPath();

test.describe("Family Dashboard public navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("header, footer, and homepage parent CTA point to /shoot/dashboard/sign-in", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    const header = page.getByTestId("family-dashboard-header-link");
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute("href", FAMILY_DASHBOARD_HREF);
    await expect(header).toHaveText(FAMILY_DASHBOARD_LABEL);

    const footer = page.getByTestId("family-dashboard-footer-link");
    await expect(footer).toBeVisible();
    await expect(footer).toHaveAttribute("href", FAMILY_DASHBOARD_HREF);

    const homeCta = page.getByTestId("family-dashboard-home-cta");
    await expect(homeCta).toBeVisible();
    await expect(homeCta).toHaveAttribute("href", FAMILY_DASHBOARD_HREF);

    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);

    await header.click();
    await expect(page).toHaveURL(/\/shoot\/dashboard\/sign-in\/?$/);
    await expect(page.locator("h1")).toContainText(/sign-in/i);
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
  });

  test("public leaderboard stays available without authentication", async ({ page }) => {
    const response = await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("h1")).toContainText(/leaderboard/i);
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Homework" }).first()).toBeVisible();
    await expect(page.getByTestId("family-dashboard-header-link")).toHaveAttribute(
      "href",
      FAMILY_DASHBOARD_HREF,
    );
  });

  test("existing catalog navigation still reaches homework", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", { name: "Shooting Challenge navigation" });
    await nav.getByRole("link", { name: "Homework" }).click();
    await expect(page).toHaveURL(/\/shoot\/homework\/?$/);
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Family Dashboard mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile menu includes Family Dashboard sign-in and keeps public links", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("family-dashboard-header-link")).toBeHidden();

    const { panel } = await openMobileNavPanel(page);
    const mobileLink = panel.getByTestId("family-dashboard-mobile-link");
    await expect(mobileLink).toBeVisible();
    await expect(mobileLink).toHaveAttribute("href", FAMILY_DASHBOARD_HREF);
    await expect(panel.getByRole("link", { name: /Leaderboard/i }).first()).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Register for the Challenge/i }),
    ).toBeVisible();

    await mobileLink.click();
    await expect(page).toHaveURL(/\/shoot\/dashboard\/sign-in\/?$/);
  });
});
