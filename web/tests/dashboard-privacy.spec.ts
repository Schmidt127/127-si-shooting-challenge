import { expect, test } from "@playwright/test";

const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14,}\b/;
const FAKE_ENROLLMENT_ID = "recABCDEFGHIJKLMN";

test.describe("dashboard privacy", () => {
  test("anonymous /dashboard shows coming soon without fictional athlete identity", async ({
    page,
  }) => {
    const response = await page.goto("dashboard", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/coming soon/i);
    await expect(page.getByText(/Jordan Reyes/i)).toHaveCount(0);
    await expect(page.getByText(/Sample preview/i)).toHaveCount(0);
    await expect(page.getByText(/Weekly summary/i)).toHaveCount(0);
  });

  test("anonymous enrollmentId on /dashboard does not expose live athlete data or record ids", async ({
    page,
  }) => {
    const response = await page.goto(`dashboard?enrollmentId=${FAKE_ENROLLMENT_ID}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(page.getByText(/Jordan Reyes/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/coming soon/i);
  });

  test("anonymous /dashboard/preview is blocked without staff access", async ({ page }) => {
    const response = await page.goto(`dashboard/preview?enrollmentId=${FAKE_ENROLLMENT_ID}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(page.getByText(/Preview unavailable|not available/i).first()).toBeVisible();
  });

  test("dashboard preview errors do not echo enrollment record ids", async ({ page }) => {
    await page.goto(`dashboard/preview?enrollmentId=${FAKE_ENROLLMENT_ID}`, {
      waitUntil: "domcontentloaded",
    });
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
  });

  test("public homework catalog still loads", async ({ page }) => {
    const response = await page.goto("homework", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("homework-catalog-list")).toBeVisible({ timeout: 30_000 });
  });

  test("approved public athlete profile still loads", async ({ page }) => {
    const response = await page.goto("athletes/testing-schmidt", {
      waitUntil: "domcontentloaded",
    });
    if (response?.status() !== 200) {
      test.skip(true, "Public athlete profile requires Airtable configuration in this environment");
      return;
    }
    const hero = page.getByTestId("athlete-profile-hero");
    if ((await hero.count()) === 0) {
      test.skip(true, "testing-schmidt profile not available in this environment");
      return;
    }
    await expect(hero).toBeVisible();
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
  });
});
