import { expect, test } from "@playwright/test";

/**
 * SC-111 public athlete profile coverage.
 * Requires local Next server + Airtable token for live slug assertions.
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14}\b/;

test.describe("public athlete profiles", () => {
  test("enabled profile slug loads with ordered sections", async ({ page }) => {
    const response = await page.goto("athletes/testing-schmidt", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/schmidt/i);
    await expect(page.getByTestId("athlete-profile-hero")).toBeVisible();
    await expect(page.getByTestId("athlete-level-display")).toBeVisible();
    await expect(page.getByTestId("level-graphic").first()).toBeVisible();
    await expect(page.getByTestId("performance-snapshot")).toBeVisible();
    await expect(page.getByTestId("shooting-stat-line")).toBeVisible();
    await expect(page.getByTestId("progression-panel")).toBeVisible();
    await expect(page.getByTestId("homework-assignments")).toBeVisible();
    await expect(page.getByTestId("streak-section")).toBeVisible();
    await expect(page.getByTestId("recent-activity")).toBeVisible();
    await expect(page.getByTestId("perfect-week-panel")).toBeVisible();
    await expect(page.getByTestId("weekly-performance")).toBeVisible();
    await expect(page.getByTestId("achievement-collection")).toBeVisible();
  });

  test("unknown and disabled-style slugs return not-found", async ({ page }) => {
    for (const slug of ["____not-a-real-athlete____", "definitely-disabled-slug"]) {
      const response = await page.goto(`athletes/${slug}`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/not found/i);
      await expect(page.getByText(/unavailable|incorrect/i).first()).toBeVisible();
    }
  });

  test("leaderboard athlete name links to profile when enabled", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    const link = page.getByRole("link", { name: /testing schmidt/i }).first();
    if ((await link.count()) === 0) {
      test.skip(true, "Testing Schmidt not present on leaderboard in this environment");
      return;
    }
    await expect(link).toHaveAttribute("href", /\/athletes\/testing-schmidt\/?$/);
    await link.focus();
    await expect(link).toBeFocused();
    await link.click();
    await expect(page).toHaveURL(/\/athletes\/testing-schmidt/);
  });

  test("homepage standings link when present", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const link = page.getByRole("link", { name: /testing schmidt/i }).first();
    if ((await link.count()) === 0) {
      test.skip(true, "Testing Schmidt not in homepage top standings");
      return;
    }
    await expect(link).toHaveAttribute("href", /\/athletes\/testing-schmidt\/?$/);
  });

  test("public display links when present", async ({ page }) => {
    await page.goto("public-display", { waitUntil: "domcontentloaded" });
    const link = page.getByRole("link", { name: /testing schmidt/i }).first();
    if ((await link.count()) === 0) {
      test.skip(true, "Testing Schmidt not on public display");
      return;
    }
    await expect(link).toHaveAttribute("href", /\/athletes\/testing-schmidt\/?$/);
  });

  test("profile HTML excludes private fields and record ids", async ({ page }) => {
    await page.goto("athletes/testing-schmidt", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(EMAIL_PATTERN);
    expect(html).not.toMatch(RECORD_ID_PATTERN);
    expect(page.url()).not.toMatch(RECORD_ID_PATTERN);
    expect(bodyText.toLowerCase()).not.toContain("parent email");
    expect(bodyText.toLowerCase()).not.toContain("stripe");
  });

  test("homework assignments remain visible on mobile without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("athletes/testing-schmidt", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("homework-assignments")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(20);
  });

  test("mobile profile has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("athletes/testing-schmidt", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(20);
  });

  test("desktop profile layout renders hero and snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("athletes/testing-schmidt", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("athlete-profile-hero")).toBeVisible();
    await expect(page.getByTestId("athlete-level-display")).toBeVisible();
    await expect(page.getByTestId("level-graphic").first()).toBeVisible();
    await expect(page.getByTestId("performance-snapshot")).toBeVisible();
  });

  test("missing detailed shooting does not invent 0% copy when unavailable", async ({
    page,
  }) => {
    await page.goto("athletes/testing-schmidt", { waitUntil: "domcontentloaded" });
    const shooting = page.getByTestId("shooting-stat-line");
    await expect(shooting).toBeVisible();
    const text = ((await shooting.innerText()) ?? "").toLowerCase();
    if (text.includes("not yet recorded") || text.includes("have not been recorded")) {
      expect(text).not.toMatch(/\b0%\b/);
    }
  });
});
