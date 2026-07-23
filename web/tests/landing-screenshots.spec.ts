import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const PHASE = process.env.SCREENSHOT_PHASE === "after" ? "after" : "before";
const OUT_DIR = path.join(process.cwd(), "test-results", "landing-redesign", PHASE);

/** Relative to playwright baseURL (`…/shoot/`). Absolute `/` leaves basePath. */
const LANDING_PATH = ".";

test.describe(`landing page ${PHASE} screenshots`, () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("desktop full page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LANDING_PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/page not found/i);
    await page.screenshot({
      path: path.join(OUT_DIR, "desktop.png"),
      fullPage: true,
    });
  });

  test("mobile full page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LANDING_PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/page not found/i);
    await page.screenshot({
      path: path.join(OUT_DIR, "mobile.png"),
      fullPage: true,
    });
  });
});
