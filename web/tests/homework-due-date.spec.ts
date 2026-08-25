import { expect, test } from "@playwright/test";

const PROD_ATHLETE_SLUG = "perfect-week-testing";
const DUE_DATE_PATTERN = /Jun(?:e)?\s+29,\s+2027/i;

test.describe("homework due dates", () => {
  test("public homework catalog shows cards with readable due dates", async ({ page }) => {
    const response = await page.goto("homework", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByTestId("homework-catalog-list")).toBeVisible({ timeout: 30_000 });
    const cards = page.getByTestId("homework-catalog-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(page.getByText(DUE_DATE_PATTERN).first()).toBeVisible();
    await expect(page.getByTestId("homework-catalog-empty")).toHaveCount(0);
    await expect(page.getByText(/temporarily unavailable/i)).toHaveCount(0);
  });

  test("athlete homework assignments show due dates when scheduled", async ({ page }) => {
    const response = await page.goto(`athletes/${PROD_ATHLETE_SLUG}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByTestId("homework-assignments")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("homework-assignments-unavailable")).toHaveCount(0);
    const rows = page.getByTestId("homework-assignment-row");
    if ((await rows.count()) === 0) {
      await expect(page.getByTestId("homework-assignments-empty")).toBeVisible();
      return;
    }
    await expect(page.getByText(DUE_DATE_PATTERN).first()).toBeVisible();
    await expect(page.getByTestId("profile-freshness-notice")).toHaveCount(0);
  });

  test("mobile homework layouts avoid horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("homework", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("homework-catalog-list")).toBeVisible({ timeout: 30_000 });
    const homeworkOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(homeworkOverflow).toBeLessThanOrEqual(20);

    await page.goto(`athletes/${PROD_ATHLETE_SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("homework-assignments")).toBeVisible({ timeout: 30_000 });
    const profileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(profileOverflow).toBeLessThanOrEqual(20);
  });
});
