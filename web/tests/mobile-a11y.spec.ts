/**
 * Mobile usability + accessibility package assertions.
 * CI-stable without live Airtable: chrome, menus, focus, and layout only.
 */
import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  mobileAlt: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

const SAMPLE_PAGES = [
  { name: "home", path: "." },
  { name: "leaderboard", path: "leaderboard" },
  { name: "homework", path: "homework" },
  { name: "dashboard", path: "dashboard" },
] as const;

async function expectSingleH1(page: Page, name: string) {
  const h1 = page.locator("h1");
  await expect(h1.first(), `${name} must render an h1`).toBeVisible({ timeout: 30_000 });
  await expect(h1, `${name} must have exactly one h1`).toHaveCount(1);
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function hasVisibleFocusCue(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const styles = getComputedStyle(el);
    const outlineOk =
      styles.outlineStyle !== "none" && styles.outlineWidth !== "0px";
    const shadowOk = styles.boxShadow !== "none" && styles.boxShadow.length > 0;
    return outlineOk || shadowOk;
  });
}

test.describe("375px mobile usability", () => {
  test.use({ viewport: VIEWPORTS.mobile });

  for (const pageDef of SAMPLE_PAGES) {
    test(`${pageDef.name}: no horizontal scroll + single h1`, async ({ page }) => {
      const response = await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expectSingleH1(page, pageDef.name);
      expect(await horizontalOverflow(page), `${pageDef.name} overflow`).toBeLessThanOrEqual(8);
    });
  }

  test("mobile menu opens, exposes links, and closes with focus return", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    await expectSingleH1(page, "home");

    const toggle = page.getByTestId("mobile-nav-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = page.getByTestId("mobile-nav-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: /leaderboard/i }).first()).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Register for the Challenge/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Submit Today's Activity/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Family Dashboard/i }),
    ).toBeVisible();

    const close = page.getByTestId("mobile-nav-close");
    await expect(close).toBeFocused();
    await close.click();

    await expect(panel).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  test("mobile menu closes on Escape and returns focus to toggle", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    const toggle = page.getByTestId("mobile-nav-toggle");
    await toggle.click();
    await expect(page.getByTestId("mobile-nav-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("mobile-nav-panel")).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test("registration gateway CTAs stay visible and meet 44px height", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const section = page.locator("#registration-gateway");
    await expect(section).toBeVisible({ timeout: 30_000 });

    const register = section.getByRole("link", { name: /Register for the Challenge/i });
    const submit = section.getByRole("link", { name: /Submit Today's Activity/i });
    await expect(register).toBeVisible();
    await expect(submit).toBeVisible();

    for (const control of [register, submit]) {
      const box = await control.boundingBox();
      expect(box, "CTA bounding box").toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("logo and header leaderboard CTA remain tappable", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const logo = page.getByRole("link", { name: /Fairfield Basketball Club home/i }).first();
    await expect(logo).toBeVisible();
    const logoBox = await logo.boundingBox();
    expect(logoBox).toBeTruthy();
    expect(Math.min(logoBox!.height, logoBox!.width)).toBeGreaterThanOrEqual(44);

    const leaderboardCta = page
      .locator("header")
      .getByRole("link", { name: /^Leaderboard$/i });
    await expect(leaderboardCta).toBeVisible();
    const ctaBox = await leaderboardCta.boundingBox();
    expect(ctaBox).toBeTruthy();
    expect(ctaBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("sticky header does not fully cover the main h1", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const covered = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      const header = document.querySelector("header");
      if (!heading || !header) return true;
      const h = heading.getBoundingClientRect();
      const top = header.getBoundingClientRect();
      // Heading top should sit below sticky header bottom (allow small overlap for padding).
      return h.top + 8 < top.bottom;
    });
    expect(covered, "h1 should not sit under sticky header").toBeFalsy();
  });
});

test.describe("768px tablet usability", () => {
  test.use({ viewport: VIEWPORTS.tablet });

  for (const pageDef of SAMPLE_PAGES) {
    test(`${pageDef.name}: chrome + no large overflow`, async ({ page }) => {
      const response = await page.goto(pageDef.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expectSingleH1(page, pageDef.name);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(16);
    });
  }

  test("desktop-style nav landmark is available at tablet width", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("navigation", { name: "Shooting Challenge navigation" }),
    ).toBeVisible();
    // Toggle remains in the DOM under md:hidden — assert it is not visible.
    await expect(page.getByTestId("mobile-nav-toggle")).toBeHidden();
  });
});

test.describe("desktop accessibility basics", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /Skip to main content/i });
    await expect(skip).toBeFocused();
    await expect(hasVisibleFocusCue(page)).resolves.toBeTruthy();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("keyboard focus cue is visible on nav links", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", { name: "Shooting Challenge navigation" });
    const levels = nav.getByRole("link", { name: /levels/i }).first();
    await levels.focus();
    await expect(levels).toBeFocused();
    expect(await hasVisibleFocusCue(page)).toBeTruthy();
  });

  test("footer quick links are underlined text links", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const footerNav = page.getByRole("navigation", { name: /footer/i });
    const link = footerNav.getByRole("link").first();
    await expect(link).toBeVisible();
    const decoration = await link.evaluate((el) => getComputedStyle(el).textDecorationLine);
    // sc-text-link sets underline; hover-only pages may still expose class-based underline via stylesheet
    const className = (await link.getAttribute("class")) || "";
    expect(className.includes("sc-text-link") || decoration.includes("underline")).toBeTruthy();
  });

  test("footer registration links use Fillout URLs with noopener", async ({ page }) => {
    await page.goto("leaderboard", { waitUntil: "domcontentloaded" });
    const registrationNav = page.getByRole("navigation", {
      name: /Shooting Challenge registration links/i,
    });
    await expect(registrationNav).toBeVisible();

    const register = registrationNav.getByRole("link", {
      name: /Register for the Challenge/i,
    });
    await expect(register).toHaveAttribute(
      "href",
      "https://forms.fairfieldbasketballclub.com/shoot-playerregistration",
    );
    await expect(register).toHaveAttribute("rel", /noopener/);

    const submit = registrationNav.getByRole("link", {
      name: /Submit Today's Activity/i,
    });
    await expect(submit).toHaveAttribute(
      "href",
      "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
    );
  });
});

test.describe("390px mobile attestation", () => {
  test.use({ viewport: VIEWPORTS.mobileAlt });

  test("home and leaderboard: single h1 + no horizontal scroll", async ({ page }) => {
    for (const path of [".", "leaderboard"] as const) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);
      await expectSingleH1(page, path);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(8);
    }
  });

  test("sign-in email is labeled and meets 44px height", async ({ page }) => {
    await page.goto("dashboard/sign-in", { waitUntil: "domcontentloaded" });
    await expectSingleH1(page, "sign-in");
    const email = page.getByLabel(/parent email/i);
    await expect(email).toBeVisible();
    const box = await email.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(8);
  });
});

test.describe("not-found accessibility chrome", () => {
  test.use({ viewport: VIEWPORTS.mobile });

  test("unknown route exposes a main landmark and home CTA", async ({ page }) => {
    const response = await page.goto("this-route-does-not-exist-sc148", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
    await expectSingleH1(page, "not-found");
    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute("tabindex", "-1");
    const home = page.getByRole("link", { name: /Back to home/i });
    await expect(home).toBeVisible();
    const box = await home.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(8);
  });
});
