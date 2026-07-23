import { expect, test } from "@playwright/test";

test("shooting challenge landing loads", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/Shooting Challenge/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/page not found/i);
});

test("leaderboard nav is reachable from landing", async ({ page }) => {
  await page.goto("./");
  await page
    .getByRole("navigation", { name: /shooting challenge navigation/i })
    .getByRole("link", { name: "Leaderboard" })
    .click();
  await expect(page).toHaveURL(/\/leaderboard\/?$/);
});
