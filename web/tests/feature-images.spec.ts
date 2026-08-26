import { expect, test } from "@playwright/test";

const featureBanners = [
  [
    "leaderboard",
    "Shooting Challenge leaderboard showing athlete rankings, XP, levels, and shots",
  ],
  ["levels", "Shooting Challenge levels progression showing XP tiers and advancement"],
  ["homework", "Shooting Challenge homework page showing published assignments and curriculum"],
  [
    "achievements",
    "Shooting Challenge achievements showing milestones, streaks, and earned progress",
  ],
] as const;

test.describe("approved Shooting Challenge feature banners", () => {
  for (const [route, label] of featureBanners) {
    for (const viewport of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 375, height: 812 },
    ]) {
      test(`${route} page renders its accessible feature banner on ${viewport.name}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });

        expect(response?.status()).toBeLessThan(500);
        expect(page.url()).toMatch(new RegExp(`/shoot/${route}$`));

        const banner = page.getByRole("figure", { name: label, exact: true });
        await expect(banner).toBeVisible();
      });
    }
  }
});
