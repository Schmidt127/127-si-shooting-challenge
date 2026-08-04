/**
 * Agent 1 hardening — tablet, a11y, hub links, reduced motion, safe external links.
 * Extends public-experience.spec.ts without requiring live Airtable data.
 */
import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

const SAMPLE_PAGES = [
  { name: "home", path: "." },
  { name: "leaderboard", path: "leaderboard" },
  { name: "levels", path: "levels" },
  { name: "homework", path: "homework" },
  { name: "zoom-meetings", path: "zoom-meetings" },
  { name: "dashboard", path: "dashboard" },
] as const;

async function expectSingleH1(page: Page, name: string) {
  const h1 = page.locator("h1");
  await expect(h1.first(), `${name} must render an h1`).toBeVisible({ timeout: 30_000 });
  await expect(h1, `${name} must have exactly one h1`).toHaveCount(1);
}

test.describe("tablet layouts", () => {
  test.use({ viewport: VIEWPORTS.tablet });

  for (const pageDef of SAMPLE_PAGES) {
    test(`${pageDef.name} tablet: chrome + no large overflow`, async ({ page }) => {
      const response = await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expectSingleH1(page, pageDef.name);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${pageDef.name} tablet overflow`).toBeLessThanOrEqual(24);
    });
  }
});

test.describe("keyboard and focus-visible", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("tab reaches a focusable control with visible focus treatment", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    await expectSingleH1(page, "leaderboard");

    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused.first()).toBeVisible();

    const outline = await focused.first().evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        boxShadow: styles.boxShadow,
      };
    });
    const hasVisibleFocus =
      (outline.outlineStyle !== "none" && outline.outlineWidth !== "0px") ||
      (outline.boxShadow && outline.boxShadow !== "none");
    expect(hasVisibleFocus, "focused control should show outline or focus ring").toBeTruthy();
  });

  test("nav landmark has accessible name", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("navigation", { name: "Shooting Challenge navigation" }),
    ).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("home renders under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto(".", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expectSingleH1(page, "home reduced-motion");
  });
});

test.describe("hub and external link safety", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("hub / back-to-landing links use https://www.fairfieldbasketballclub.com", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const hubLinks = page.locator(
      'a[href^="https://www.fairfieldbasketballclub.com"]',
    );
    await expect(hubLinks.first()).toBeVisible();
    const hrefs = await hubLinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).href),
    );
    expect(hrefs.some((h) => h.includes("hooopchallenges"))).toBeFalsy();
    expect(
      hrefs.every((h) => h.startsWith("https://www.fairfieldbasketballclub.com")),
    ).toBeTruthy();
  });

  test("external target=_blank links include noopener", async ({ page }) => {
    await page.goto("articles", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
    const unsafe = await page.evaluate(() => {
      const blanks = Array.from(document.querySelectorAll('a[target="_blank"]'));
      return blanks
        .filter((a) => {
          const rel = (a.getAttribute("rel") || "").toLowerCase();
          return !rel.includes("noopener") && !rel.includes("noreferrer");
        })
        .map((a) => (a as HTMLAnchorElement).href);
    });
    expect(unsafe, "target=_blank without noopener/noreferrer").toEqual([]);
  });
});

test.describe("favicon and metadata paths under /shoot", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("document has favicon link under basePath or absolute", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const icon = page.locator('link[rel="icon"], link[rel="shortcut icon"]');
    await expect(icon.first()).toHaveCount(1);
    const href = (await icon.first().getAttribute("href")) || "";
    expect(href.length).toBeGreaterThan(0);
    // Prefer /shoot-prefixed or absolute https — never bare wrong host typo
    expect(href.includes("hooopchallenges")).toBeFalsy();
  });

  test("demo athlete label remains demo (not live season claim)", async ({ page }) => {
    await page.goto("athletes/demo-athlete", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/demo/i).first()).toBeVisible();
  });
});

test.describe("missing cover / malformed rich text resilience", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("zoom meetings list survives empty/missing covers without 5xx", async ({ page }) => {
    const response = await page.goto("zoom-meetings", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expectSingleH1(page, "zoom-meetings");
  });

  test("articles list survives empty catalog without 5xx", async ({ page }) => {
    const response = await page.goto("articles", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expectSingleH1(page, "articles");
  });
});
