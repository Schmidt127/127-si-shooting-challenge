import { expect, test } from "@playwright/test";

const OFFICIAL_ORIGIN = "https://www.fairfieldbasketballclub.com";
const OFFICIAL_BASE = `${OFFICIAL_ORIGIN}/shoot`;

test.describe("pre-launch search exclusion", () => {
  test("home remains noindex while canonical points to Fairfield /shoot", async ({ page }) => {
    const response = await page.goto(".", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /nofollow/i);

    const googlebot = page.locator('meta[name="googlebot"]');
    await expect(googlebot).toHaveAttribute("content", /noindex/i);
    await expect(googlebot).toHaveAttribute("content", /nofollow/i);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", OFFICIAL_BASE);
  });

  test("robots allows public /shoot and excludes admin/api", async ({ request }) => {
    const response = await request.get(`${OFFICIAL_BASE}/robots.txt`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Allow: /shoot/");
    expect(body).toContain("Disallow: /shoot/admin");
    expect(body).toContain("Disallow: /shoot/api/");
    expect(body).toContain(`Sitemap: ${OFFICIAL_BASE}/sitemap.xml`);
  });

  test("sitemap uses official Fairfield /shoot URLs", async ({ request }) => {
    const response = await request.get(`${OFFICIAL_BASE}/sitemap.xml`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain(`<loc>${OFFICIAL_BASE}</loc>`);
    expect(body).toContain(`<loc>${OFFICIAL_BASE}/leaderboard</loc>`);
    expect(body).toContain(`<loc>${OFFICIAL_BASE}/homework</loc>`);
    expect(body).not.toContain("vercel.app");
    expect(body).not.toContain("hoopchallenges");
  });
});
