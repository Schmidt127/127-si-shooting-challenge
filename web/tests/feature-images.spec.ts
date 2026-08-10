import { expect, test } from "@playwright/test";

const featureImages = [
  ["leaderboard", "shooting-challenge-leaderboard.webp"],
  ["levels", "shooting-challenge-levels.webp"],
  ["homework", "shooting-challenge-homework.webp"],
  ["achievements", "shooting-challenge-achievements-profile.webp"],
] as const;

test.describe("approved Shooting Challenge feature images", () => {
  for (const [route, filename] of featureImages) {
    test(`${route} page renders its approved image`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const image = page.locator(`img[src*="/images/${filename}"]`);
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute("width", "1672");
      await expect(image).toHaveAttribute("height", "941");
    });
  }
});
