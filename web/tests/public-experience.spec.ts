import { expect, test, type Page } from "@playwright/test";

/**
 * Public experience assertions (Agent 6 / SC-118).
 *
 * Designed to be CI-stable WITHOUT live Airtable credentials: every
 * Airtable-backed page must render one of its designed states (data, empty,
 * or error) with the page chrome intact. No test asserts on live record
 * contents.
 */

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

/** Relative to playwright baseURL (`…/shoot/`). */
const PUBLIC_PAGES = [
  { name: "home", path: "." },
  { name: "leaderboard", path: "leaderboard" },
  { name: "homework", path: "homework" },
  { name: "tutorials", path: "tutorials" },
  { name: "shoutouts", path: "shoutouts" },
  { name: "articles", path: "articles" },
  { name: "levels", path: "levels" },
  { name: "achievements", path: "achievements" },
  { name: "zoom-meetings", path: "zoom-meetings" },
  { name: "game-manual", path: "game-manual" },
  { name: "public-display", path: "public-display" },
  { name: "dashboard", path: "dashboard" },
  { name: "athlete-profile-demo", path: "athletes/demo-athlete" },
  { name: "admin", path: "admin" },
] as const;

/** Matches rendered email addresses (privacy leak canary). */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

async function expectPageChrome(page: Page, name: string) {
  const h1 = page.locator("h1");
  await expect(h1.first(), `${name} must render an h1`).toBeVisible({ timeout: 30_000 });
  await expect(h1, `${name} must have exactly one h1`).toHaveCount(1);
}

test.describe("public pages render on desktop", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  for (const pageDef of PUBLIC_PAGES) {
    test(`${pageDef.name} responds and renders chrome`, async ({ page }) => {
      const response = await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${pageDef.name} should not 5xx`).toBeLessThan(500);
      await expectPageChrome(page, pageDef.name);
    });
  }
});

test.describe("public pages render on mobile", () => {
  test.use({ viewport: VIEWPORTS.mobile });

  for (const pageDef of PUBLIC_PAGES) {
    test(`${pageDef.name} renders without horizontal overflow`, async ({ page }) => {
      await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      await expectPageChrome(page, pageDef.name);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${pageDef.name} mobile horizontal overflow px`).toBeLessThanOrEqual(20);
    });
  }
});

test.describe("navigation and accessibility basics", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("program nav landmark is labelled and navigates", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: /shooting challenge/i });
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: /levels/i }).first().click();
    await expect(page).toHaveURL(/\/levels/);
    await expectPageChrome(page, "levels via nav");
  });

  test("root layout keeps sitewide noindex until cutover decision", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    const content = (await robots.getAttribute("content")) ?? "";
    expect(content).toContain("noindex");
  });

  test("html lang attribute is set", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("empty / invalid / failure states", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  const MISSING_DETAIL_ROUTES = [
    "homework/rec00000000000000",
    "levels/rec00000000000000",
    "tutorials/rec00000000000000",
    "zoom-meetings/rec00000000000000",
  ];

  for (const route of MISSING_DETAIL_ROUTES) {
    test(`missing detail record ${route} renders friendly state`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), "must not 5xx").toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
    });
  }

  test("nonsense athlete slug still renders safe profile shell", async ({ page }) => {
    const response = await page.goto("athletes/____not-a-real-athlete____", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
  });

  test("unknown route renders not-found page", async ({ page }) => {
    const response = await page.goto("definitely-not-a-route", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
  });
});

test.describe("privacy", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  const PRIVACY_SENSITIVE_PAGES = [
    "leaderboard",
    "public-display",
    "athletes/demo-athlete",
    "dashboard",
    "admin",
  ];

  for (const route of PRIVACY_SENSITIVE_PAGES) {
    test(`${route} renders no email addresses`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });

      const bodyText = (await page.locator("body").innerText()) ?? "";
      expect(bodyText, `${route} must not render email addresses`).not.toMatch(EMAIL_PATTERN);
    });
  }

  test("admin placeholder confirms no participant data and no writes", async ({ page }) => {
    await page.goto("admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/participant data exposed: no/i)).toBeVisible();
    await expect(page.getByText(/writes enabled: no/i)).toBeVisible();
  });
});
