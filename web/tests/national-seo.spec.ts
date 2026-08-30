import { expect, test } from "@playwright/test";

const LOCAL_BASE = "http://127.0.0.1:3001/shoot";
const configuredBase = process.env.PLAYWRIGHT_BASE_URL?.trim().replace(/\/$/, "");
const SITE_BASE = configuredBase || LOCAL_BASE;

test.describe("national SEO messaging", () => {
  test("homepage communicates challenge facts, grades, and online scope", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    await expect(page.locator("h1")).toContainText(/Earn XP/i);
    await expect(page.getByText(/grades 1–12/i).first()).toBeVisible();
    await expect(page.getByText(/Educational Athletics/i).first()).toBeVisible();
    await expect(page.getByText(/100% online/i).first()).toBeVisible();
    await expect(page.getByText(/May 1–June 30/i).first()).toBeVisible();
  });

  test("homepage metadata is national-first", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toMatch(/Shooting Challenge/i);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /Earn XP/i);
    await expect(description).toHaveAttribute("content", /grades 1–12/i);
    await expect(description).toHaveAttribute("content", /May 1–June 30/i);
  });

  test("homepage uses descriptive internal links", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("link", { name: /Explore the 12 levels/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Read program FAQ/i }).first()).toBeVisible();
    await expect(page.getByText(/^Open$/)).toHaveCount(0);
  });

  test("major public pages have unique titles", async ({ page }) => {
    const routes = [
      { path: "leaderboard", pattern: /Leaderboard|Rankings/i },
      { path: "homework", pattern: /Homework|Training/i },
      { path: "faq", pattern: /FAQ/i },
      { path: "game-manual", pattern: /Game Manual|Rules/i },
    ];

    const titles: string[] = [];
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const title = await page.title();
      expect(title).toMatch(route.pattern);
      titles.push(title);
    }

    expect(new Set(titles).size).toBe(titles.length);
  });

  test("faq page exposes FAQ structured data", async ({ page }) => {
    await page.goto("faq", { waitUntil: "domcontentloaded" });

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const raw = (await jsonLd.textContent()) ?? "";
    expect(raw).toMatch(/FAQPage/);
    expect(raw).toMatch(/grades/i);
    expect(raw).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });

  test("copy does not claim unsupported nationwide in-person services", async ({ page }) => {
    await page.goto("faq", { waitUntil: "domcontentloaded" });
    const body = (await page.locator("main").textContent()) ?? "";
    expect(body).toMatch(/do not claim in-person coaching/i);
  });

  test("homepage includes About the Coach section", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "About the Coach" })).toBeVisible();
    await expect(page.getByText(/Montana educator, athletic director, and coach/i).first()).toBeVisible();
    await expect(page.getByText(/127 Sports Intensity and the Shooting Challenge/i).first()).toBeVisible();
  });

  test("faq includes gift card award commitment", async ({ page }) => {
    await page.goto("faq", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /gift card award commitment/i }),
    ).toBeVisible();
    const body = (await page.locator("main").textContent()) ?? "";
    expect(body).toMatch(/100% of registration fees collected/i);
    expect(body).toMatch(/program director's discretion/i);
    expect(body).toMatch(/not a guarantee that every individual athlete/i);
    expect(body.toLowerCase()).not.toMatch(/refund/);
  });
});

test.describe("faq route indexing", () => {
  test("faq is listed in sitemap", async ({ request }) => {
    const response = await request.get(`${SITE_BASE}/sitemap.xml`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/<loc>[^<]+\/shoot\/faq<\/loc>/);
  });
});
