import { expect, test } from "@playwright/test";

const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14,}\b/;

test.describe("multi-child dashboard selection privacy", () => {
  test("anonymous /dashboard/select does not expose private data or record ids", async ({
    page,
  }) => {
    const response = await page.goto("dashboard/select", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /sign-in|choose athlete|coming soon/i,
    );
  });

  test("legacy enrollmentId query is stripped and never authorizes anonymous access", async ({
    page,
  }) => {
    const response = await page.goto("dashboard?enrollmentId=recABCDEFGHIJKLMN", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(500);
    await expect(page).not.toHaveURL(/enrollmentId=/i);
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /coming soon|sign-in/i,
    );
  });

  test("family switcher markup must not use enrollmentId query links when present", async ({
    page,
  }) => {
    await page.goto("dashboard", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    expect(html).not.toMatch(/href=["'][^"']*enrollmentId=rec/i);
    expect(html).not.toMatch(RECORD_ID_PATTERN);
  });
});
