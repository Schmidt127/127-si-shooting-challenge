import { expect, test } from "@playwright/test";

const LOCAL_BASE = "http://127.0.0.1:3001/shoot";
const configuredBase = process.env.PLAYWRIGHT_BASE_URL?.trim().replace(/\/$/, "");
const SITE_BASE = configuredBase || LOCAL_BASE;
const INDEXING_ENABLED = process.env.NEXT_PUBLIC_ALLOW_SEARCH_INDEXING?.trim().toLowerCase();

function indexingEnabled(): boolean {
  if (isProductionTarget()) return true;
  return INDEXING_ENABLED === "true" || INDEXING_ENABLED === "1";
}

function isProductionTarget(): boolean {
  return SITE_BASE.includes("fairfieldbasketballclub.com");
}

test.describe("search indexing policy", () => {
  test("home canonical resolves to the program root", async ({ page }) => {
    const response = await page.goto(".", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);

    const href = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(href).toBeTruthy();
    if (isProductionTarget()) {
      expect(href).toBe(SITE_BASE);
    } else {
      expect(href).toMatch(/\/shoot$/);
    }
  });

  test("public program robots follow NEXT_PUBLIC_ALLOW_SEARCH_INDEXING", async ({ page }) => {
    await page.goto("homework", { waitUntil: "domcontentloaded", timeout: 60_000 });

    const robots = page.locator('meta[name="robots"]').first();
    await expect(robots).toBeAttached({ timeout: 60_000 });
    const content = (await robots.getAttribute("content")) ?? "";

    if (indexingEnabled()) {
      expect(content).not.toMatch(/noindex/i);
      expect(content).not.toMatch(/nofollow/i);
    } else {
      expect(content).toMatch(/noindex/i);
      expect(content).toMatch(/nofollow/i);
    }
  });

  test("leaderboard has canonical, Open Graph, and Twitter metadata", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    if (isProductionTarget()) {
      expect(canonical).toBe(`${SITE_BASE}/leaderboard`);
    } else {
      expect(canonical).toMatch(/\/shoot\/leaderboard$/);
    }

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Leaderboard/i,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("athlete profiles remain noindex until athlete indexing cutover", async ({ page }) => {
    await page.goto("athletes/demo-athlete", { waitUntil: "domcontentloaded" });

    const robotsTags = page.locator('meta[name="robots"]');
    const count = await robotsTags.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const content = (await robotsTags.nth(i).getAttribute("content")) ?? "";
      expect(content).toMatch(/noindex/i);
    }

    const description = page.locator('meta[name="description"]');
    if ((await description.count()) > 0) {
      const content = (await description.first().getAttribute("content")) ?? "";
      expect(content.toLowerCase()).not.toMatch(/\bgrade\b/);
      expect(content.toLowerCase()).not.toMatch(/\bschool\b/);
      expect(content).not.toMatch(/@/);
    }

    const ogDescription = page.locator('meta[property="og:description"]');
    if ((await ogDescription.count()) > 0) {
      const content = (await ogDescription.first().getAttribute("content")) ?? "";
      expect(content.toLowerCase()).not.toMatch(/\bgrade\b/);
      expect(content.toLowerCase()).not.toMatch(/\bschool\b/);
    }
  });

  test("private routes remain noindex", async ({ page }) => {
    for (const path of ["admin", "public-display", "dashboard/preview"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      expect(response?.status(), `${path} status`).toBeLessThan(500);

      const robots = page.locator('meta[name="robots"]').first();
      await expect(robots, `${path} robots`).toBeAttached({ timeout: 30_000 });
      await expect(robots, `${path} robots`).toHaveAttribute("content", /noindex/i);
    }
  });
});

test.describe("robots.txt and sitemap.xml", () => {
  test("robots allows public /shoot and excludes private routes", async ({ request }) => {
    const response = await request.get(`${SITE_BASE}/robots.txt`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Allow: /shoot/");
    expect(body).toContain("Disallow: /shoot/admin");
    expect(body).toContain("Disallow: /shoot/api/");
    expect(body).toContain("Disallow: /shoot/dashboard");
    expect(body).toContain("Disallow: /shoot/athletes/");
    expect(body).toContain("Disallow: /shoot/public-display");
    expect(body).toMatch(/Sitemap: .+\/shoot\/sitemap\.xml/);
  });

  test("sitemap lists public program routes and excludes private routes", async ({ request }) => {
    const response = await request.get(`${SITE_BASE}/sitemap.xml`);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/<loc>[^<]+\/shoot<\/loc>/);
    const faqLive = (await request.get(`${SITE_BASE}/faq`)).status() === 200;
    if (faqLive) {
      expect(body).toMatch(/<loc>[^<]+\/shoot\/faq<\/loc>/);
    }
    expect(body).toMatch(/<loc>[^<]+\/shoot\/leaderboard<\/loc>/);
    expect(body).toMatch(/<loc>[^<]+\/shoot\/homework<\/loc>/);
    expect(body).not.toMatch(/\/shoot\/dashboard/);
    expect(body).not.toMatch(/\/shoot\/public-display/);
    expect(body).not.toMatch(/\/shoot\/athletes\//);
    expect(body).not.toMatch("vercel.app");
    expect(body).not.toMatch("hoopchallenges");
  });

  test("dynamic detail URLs appear when catalogs are available", async ({ request }) => {
    const response = await request.get(`${SITE_BASE}/sitemap.xml`);
    expect(response.status()).toBe(200);
    const body = await response.text();

    const dynamicPatterns = [
      /\/shoot\/homework\/rec[a-zA-Z0-9]{14}/,
      /\/shoot\/tutorials\/rec[a-zA-Z0-9]{14}/,
      /\/shoot\/articles\/rec[a-zA-Z0-9]{14}/,
      /\/shoot\/shoutouts\/rec[a-zA-Z0-9]{14}/,
      /\/shoot\/zoom-meetings\/rec[a-zA-Z0-9]{14}/,
      /\/shoot\/levels\/rec[a-zA-Z0-9]{14}/,
    ];

    const matches = dynamicPatterns.filter((pattern) => pattern.test(body));
    if (!process.env.AIRTABLE_API_TOKEN?.trim()) {
      expect(matches.length).toBe(0);
      return;
    }

    expect(
      matches.length,
      `expected at least one dynamic sitemap URL; body snippet: ${body.slice(0, 500)}`,
    ).toBeGreaterThan(0);
  });
});
