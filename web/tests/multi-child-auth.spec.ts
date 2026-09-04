import { expect, test } from "@playwright/test";

const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14,}\b/;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";

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

  test("select-enrollment JSON redirectTo is app-relative (prevents /shoot/shoot 404)", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_PATH}/api/auth/select-enrollment`, {
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      data: { selectionKey: "opaque-key-without-session" },
    });
    // Unauthenticated → 401 JSON; body must never advertise a public /shoot path for router.push.
    expect([401, 403]).toContain(response.status());
    if (response.headers()["content-type"]?.includes("application/json")) {
      const payload = (await response.json()) as { redirectTo?: string };
      if (payload.redirectTo) {
        expect(payload.redirectTo).not.toMatch(/^\/shoot(\/|$)/);
        expect(payload.redirectTo).not.toContain("/shoot/shoot");
      }
    }
  });

  test("doubled basePath /shoot/shoot/dashboard is not a valid app route", async ({ page }) => {
    // Guard: the production bug navigated here after child select. Assert it 404s
    // so regressions cannot silently “look like” a dashboard.
    const response = await page.goto("/shoot/shoot/dashboard", {
      waitUntil: "domcontentloaded",
    });
    const status = response?.status() ?? 0;
    expect(status === 404 || status >= 400).toBeTruthy();
    await expect(page).toHaveURL(/\/shoot\/shoot\/dashboard/);
  });

  test("public catalog routes stay open without login", async ({ page }) => {
    for (const path of ["leaderboard", "levels", "homework", "achievements"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/dashboard\/sign-in/);
    }
  });
});
