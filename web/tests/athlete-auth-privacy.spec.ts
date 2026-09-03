/**
 * Parent magic-link auth privacy and protection tests (SC-112).
 */
import { expect, test } from "@playwright/test";

const RECORD_ID_PATTERN = /\brec[a-zA-Z0-9]{14}\b/;

test.describe("athlete auth privacy", () => {
  test("public catalog routes stay reachable without auth", async ({ page }) => {
    for (const path of ["leaderboard", "homework", "levels"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test("anonymous dashboard stays protected when auth is enabled", async ({ page }) => {
    test.skip(
      process.env.ATHLETE_AUTH_ENABLED !== "true",
      "Set ATHLETE_AUTH_ENABLED=true for auth e2e runs",
    );

    await page.goto("dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/sign-in/);
  });

  test("sign-in page does not expose record ids or internal errors", async ({ page }) => {
    test.skip(
      process.env.ATHLETE_AUTH_ENABLED !== "true",
      "Set ATHLETE_AUTH_ENABLED=true for auth e2e runs",
    );

    await page.goto("dashboard/sign-in?error=invalid", { waitUntil: "domcontentloaded" });
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(RECORD_ID_PATTERN);
    expect(bodyText.toLowerCase()).not.toContain("airtable");
    expect(bodyText.toLowerCase()).not.toContain("stack");
  });

  test("magic-link request returns uniform confirmation copy", async ({ request }) => {
    test.skip(
      process.env.ATHLETE_AUTH_ENABLED !== "true",
      "Set ATHLETE_AUTH_ENABLED=true for auth e2e runs",
    );

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";
    const known = await request.post(`${basePath}/api/auth/magic-link`, {
      data: { email: "schmidt@fairfieldbasketballclub.com" },
    });
    const unknown = await request.post(`${basePath}/api/auth/magic-link`, {
      data: { email: "not-registered@fairfield.k12.mt.us" },
    });

    const knownJson = await known.json();
    const unknownJson = await unknown.json();
    expect(knownJson.message).toBe(unknownJson.message);
  });

  test("select and dashboard paths stay free of enrollmentId query params", async ({ page }) => {
    test.skip(
      process.env.ATHLETE_AUTH_ENABLED !== "true",
      "Set ATHLETE_AUTH_ENABLED=true for auth e2e runs",
    );

    await page.goto("dashboard/select", { waitUntil: "domcontentloaded" });
    // Anonymous users redirect to sign-in; authenticated multi-child stay on select.
    const url = page.url();
    expect(url).not.toContain("enrollmentId=");
    expect(url).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });
});
