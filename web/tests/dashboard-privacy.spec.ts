import { expect, test } from "@playwright/test";

const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14,}\b/;

test.describe("dashboard privacy", () => {
  test("anonymous /dashboard stays private without fictional athlete identity", async ({
    page,
  }) => {
    const response = await page.goto("dashboard", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    // SC-112: auth off → coming soon; auth on → redirect to sign-in.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /coming soon|sign-in/i,
    );
    await expect(page.getByText(/Jordan Reyes/i)).toHaveCount(0);
    await expect(page.getByText(/Sample preview/i)).toHaveCount(0);
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
  });

  test("anonymous enrollmentId on /dashboard does not expose live athlete data or record ids", async ({
    page,
  }) => {
    const response = await page.goto("dashboard?enrollmentId=recABCDEFGHIJKLMN", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(page.getByText(/Jordan Reyes/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /coming soon|sign-in/i,
    );
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
  });

  test("anonymous /dashboard/preview is blocked without staff access", async ({ page }) => {
    const response = await page.goto("dashboard/preview?enrollmentId=recABCDEFGHIJKLMN", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(
      page
        .getByText(/Preview unavailable|not available|could not load this information/i)
        .or(page.getByRole("heading", { name: /XP activity preview/i }))
        .first(),
    ).toBeVisible();
  });

  test("dashboard preview errors do not echo enrollment record ids", async ({ page }) => {
    await page.goto("dashboard/preview?enrollmentId=recABCDEFGHIJKLMN", {
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
    const html = await page.content();
    expect(html).not.toMatch(/[?&]token=/i);
    expect(html).not.toMatch(/lambda-url\.[^"'<\s]+\/file\//i);
    expect(html).not.toContain("View Submitted Homework");
    expect(html).not.toContain('data-testid="coach-feedback-quote"');
    expect(bodyText.toLowerCase()).not.toContain("coach feedback:");
  });

  test("dashboard sign-in page is reachable without exposing record ids", async ({ page }) => {
    const response = await page.goto("dashboard/sign-in", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("leaderboard remains public without auth", async ({ page }) => {
    const response = await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("dashboard reduced motion", () => {
  test("anonymous dashboard renders under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto("dashboard", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /coming soon|sign-in/i,
    );
  });
});
