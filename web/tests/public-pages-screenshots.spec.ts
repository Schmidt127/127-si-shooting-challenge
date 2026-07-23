import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const PHASE = process.env.SCREENSHOT_PHASE === "after" ? "after" : "before";
const OUT_DIR = path.join(
  process.env.SCREENSHOT_OUT_DIR ||
    path.join("/opt/cursor/artifacts/screenshots", PHASE),
);

/** Relative to playwright baseURL (`…/shoot/`). */
const PAGES: { name: string; path: string; heading?: RegExp }[] = [
  { name: "home", path: ".", heading: /./ },
  { name: "dashboard", path: "dashboard" },
  { name: "leaderboard", path: "leaderboard" },
  { name: "homework", path: "homework" },
  { name: "levels", path: "levels" },
  { name: "achievements", path: "achievements" },
  { name: "articles", path: "articles" },
  { name: "tutorials", path: "tutorials" },
  { name: "zoom-meetings", path: "zoom-meetings" },
  { name: "shoutouts", path: "shoutouts" },
  { name: "public-display", path: "public-display" },
  { name: "game-manual", path: "game-manual" },
  { name: "athletes-demo", path: "athletes/demo-athlete" },
  { name: "admin", path: "admin" },
  /** Detail routes without live Airtable — capture not-found / error chrome. */
  { name: "homework-detail-missing", path: "homework/rec00000000000000" },
  { name: "tutorials-detail-missing", path: "tutorials/rec00000000000000" },
  { name: "levels-detail-missing", path: "levels/rec00000000000000" },
  { name: "articles-detail-missing", path: "articles/rec00000000000000" },
  { name: "shoutouts-detail-missing", path: "shoutouts/rec00000000000000" },
  { name: "zoom-detail-missing", path: "zoom-meetings/rec00000000000000" },
];

test.describe(`public pages ${PHASE} screenshots`, () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const pageDef of PAGES) {
    test(`${pageDef.name} desktop + mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const response = await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      expect(response, `${pageDef.name} should respond`).toBeTruthy();
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: path.join(OUT_DIR, `${pageDef.name}-desktop.png`),
        fullPage: true,
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: path.join(OUT_DIR, `${pageDef.name}-mobile.png`),
        fullPage: true,
      });
    });
  }
});
