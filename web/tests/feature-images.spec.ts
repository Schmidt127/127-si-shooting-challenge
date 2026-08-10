import { expect, test } from "@playwright/test";

const featureImages = [
  [
    "leaderboard",
    "Shooting Challenge leaderboard showing athlete rankings, XP, levels, and shots",
  ],
  ["levels", "Shooting Challenge levels progression showing XP tiers and advancement"],
  ["homework", "Shooting Challenge homework page showing published assignments and curriculum"],
  [
    "achievements",
    "Shooting Challenge achievements and player profile view showing earned progress",
  ],
] as const;

test.describe("approved Shooting Challenge feature images", () => {
  for (const [route, alt] of featureImages) {
    for (const viewport of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 375, height: 812 },
    ]) {
      test(`${route} page renders its approved image on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });

        expect(response?.status()).toBeLessThan(500);
        expect(page.url()).toMatch(new RegExp(`/shoot/${route}$`));

        const image = page.getByRole("img", { name: alt, exact: true });
        await expect(image).toBeVisible();
        await expect(image).toHaveAttribute("width", "1672");
        await expect(image).toHaveAttribute("height", "941");

        const beforeLoad = await image.boundingBox();
        expect(beforeLoad).toBeTruthy();
        await expect
          .poll(() => image.evaluate((element) => (element as HTMLImageElement).complete))
          .toBeTruthy();
        await expect
          .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
          .toBeGreaterThan(0);

        const afterLoad = await image.boundingBox();
        expect(afterLoad).toBeTruthy();
        expect(Math.abs(afterLoad!.height - beforeLoad!.height)).toBeLessThanOrEqual(1);
        expect(afterLoad!.width / afterLoad!.height).toBeCloseTo(1672 / 941, 2);
      });
    }
  }
});
