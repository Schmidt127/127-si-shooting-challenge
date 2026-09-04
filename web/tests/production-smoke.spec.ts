/**
 * Production-readiness smoke package for `/shoot`.
 *
 * Read-only. Does not submit Fillout forms, create Airtable records,
 * send emails, or mutate athlete/XP data.
 *
 * Local (default): Playwright starts `next start` via playwright.config.ts
 * Production / preview:
 *   PLAYWRIGHT_BASE_URL=https://www.fairfieldbasketballclub.com/shoot/ \
 *     npx playwright test tests/production-smoke.spec.ts
 */

import { expect, test } from "@playwright/test";

import {
  FILL_OUT,
  OFFICIAL_LANDING_URL,
  getPublicSmokeRoutes,
  REQUIRED_ASSETS,
  VIEWPORTS,
  expectRouteLoadsWithCleanConsole,
  expectHealthyResponse,
  expectSingleHeading,
  findDuplicatedBasePaths,
  findUnsafeBlankTargets,
  openMobileNavPanel,
} from "./helpers/smoke";

test.describe("production smoke — desktop routes", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  for (const route of getPublicSmokeRoutes()) {
    test(`${route.name} loads with heading and no material console errors`, async ({
      page,
    }) => {
      await expectRouteLoadsWithCleanConsole(page, route);
    });
  }
});

test.describe("production smoke — mobile routes", () => {
  test.use({ viewport: VIEWPORTS.mobile });

  for (const route of getPublicSmokeRoutes()) {
    test(`${route.name} mobile chrome + no large overflow`, async ({ page }) => {
      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
      });
      await expectHealthyResponse(response, route.name);
      await expectSingleHeading(page, route.name);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${route.name} mobile overflow`).toBeLessThanOrEqual(24);
    });
  }
});

test.describe("production smoke — registration gateway + external URLs", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("registration gateway shows both Fillout CTAs with exact URLs", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const section = page.locator("#registration-gateway");
    await expect(section).toBeVisible({ timeout: 30_000 });

    const register = section.getByRole("link", {
      name: /Register for the Challenge/i,
    });
    await expect(register).toBeVisible();
    await expect(register).toHaveAttribute("href", FILL_OUT.playerRegistration);
    await expect(register).toHaveAttribute("target", "_blank");
    await expect(register).toHaveAttribute("rel", /noopener/);
    await expect(register).toHaveAttribute("rel", /noreferrer/);

    const submit = section.getByRole("link", {
      name: /Submit Today's Activity/i,
    });
    await expect(submit).toBeVisible();
    await expect(submit).toHaveAttribute("href", FILL_OUT.dailySubmissions);
    await expect(submit).toHaveAttribute("target", "_blank");
    await expect(submit).toHaveAttribute("rel", /noopener/);
    await expect(submit).toHaveAttribute("rel", /noreferrer/);
  });

  test("logo and landing links use official fairfieldbasketballclub.com host", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const landingLinks = page.locator(`a[href="${OFFICIAL_LANDING_URL}"]`);
    await expect(
      landingLinks.first(),
      "at least one logo/landing link must target the official host",
    ).toBeVisible();

    const hrefs = await landingLinks.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).href.replace(/\/$/, "")),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    expect(
      hrefs.every((h) => h === OFFICIAL_LANDING_URL),
    ).toBeTruthy();

    // Guard against the known historical typo domain.
    const typo = page.locator('a[href*="hooopchallenges"]');
    await expect(typo).toHaveCount(0);
  });

  test("does not navigate into live Fillout forms during smoke", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const register = page
      .locator("#registration-gateway")
      .getByRole("link", { name: /Register for the Challenge/i });
    await expect(register).toHaveAttribute("href", FILL_OUT.playerRegistration);
    // Assert href only — never click through to submit a live form.
    expect(page.url()).not.toContain("forms.fairfieldbasketballclub.com");
  });
});

test.describe("production smoke — mobile menu + More nav", () => {
  test.use({ viewport: VIEWPORTS.mobile });

  test("mobile menu opens, shows registration CTAs, and closes on Escape", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    // Pre-deploy PROD may still use the older nav; skip until SC-148 is live.
    if ((await page.getByTestId("mobile-nav-toggle").count()) === 0) {
      test.skip(
        true,
        "mobile-nav-toggle not present on this deployment (SC-148 not installed yet)",
      );
      return;
    }
    const { toggle, panel } = await openMobileNavPanel(page);

    await expect(
      panel.getByRole("link", { name: /Register for the Challenge/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Submit Today's Activity/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Achievements/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Family Dashboard/i }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(async () => {
      await expect(toggle).toBeFocused();
    }).toPass({ timeout: 5_000 });
  });
});

test.describe("production smoke — navigation, assets, basePath", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("program nav links resolve without 404/5xx", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", {
      name: "Shooting Challenge navigation",
    });
    await expect(nav).toBeVisible();

    // Primary strip — Dashboard + Display are chrome-excluded (direct URL only).
    const primaryLabels = [
      "Leaderboard",
      "Homework",
      "Levels",
      "Zoom Meetings",
    ];

    for (const label of primaryLabels) {
      const link = nav.getByRole("link", { name: label }).first();
      await expect(link, `nav link ${label}`).toBeVisible();
      const href = await link.getAttribute("href");
      expect(href, `${label} href`).toBeTruthy();
      expect(href, `${label} must not duplicate basePath`).not.toContain(
        "/shoot/shoot",
      );

      const response = await page.goto(href!, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${label} nav destination`).toBeLessThan(500);
      expect(response?.status(), `${label} nav destination 404`).not.toBe(404);
      await expectSingleHeading(page, `nav→${label}`);
      await page.goto(".", { waitUntil: "domcontentloaded" });
    }

    await nav.getByRole("button", { name: /Resources/i }).click();
    for (const resourceLabel of ["Tutorials", "Shoutouts", "Articles"]) {
      await expect(
        page.getByRole("menuitem", { name: resourceLabel }),
        `Resources menu item ${resourceLabel}`,
      ).toBeVisible();
    }

    await nav.getByRole("button", { name: /More/i }).click();
    for (const moreLabel of ["Game Manual", "FAQ", "Achievements"]) {
      await expect(
        page.getByRole("menuitem", { name: moreLabel }),
        `More menu item ${moreLabel}`,
      ).toBeVisible();
    }
    await expect(page.getByRole("menuitem", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Display" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Achievements" }).click();
    await expect(page).toHaveURL(/\/achievements/);
    await expectSingleHeading(page, "nav→Achievements via More");
  });

  test("required brand assets return success under /shoot", async ({
    page,
    request,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const origin = new URL(page.url()).origin;
    const basePath = "/shoot";

    for (const asset of REQUIRED_ASSETS) {
      const url = `${origin}${basePath}${asset}`;
      const res = await request.get(url);
      expect(res.status(), asset).toBeLessThan(400);
      expect(res.status(), `${asset} not found`).not.toBe(404);
    }
  });

  test("no duplicated /shoot/shoot paths in document references", async ({
    page,
  }) => {
    for (const route of ["", "leaderboard", "dashboard", "homework"]) {
      await page.goto(route || ".", { waitUntil: "domcontentloaded" });
      const bad = await findDuplicatedBasePaths(page);
      expect(bad, `duplicated basePath on ${route || "home"}`).toEqual([]);
    }
  });

  test("external target=_blank links include noopener or noreferrer", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const unsafe = await findUnsafeBlankTargets(page);
    expect(unsafe, "unsafe blank targets").toEqual([]);
  });
});

test.describe("production smoke — athlete surfaces (read-only demo)", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("athlete dashboard stays private for anonymous visitors (coming soon or sign-in)", async ({
    page,
  }) => {
    const response = await page.goto("dashboard", {
      waitUntil: "domcontentloaded",
    });
    await expectHealthyResponse(response, "dashboard");
    await expectSingleHeading(page, "dashboard");
    // SC-112: auth off → coming soon; auth on → redirect to /dashboard/sign-in.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /coming soon|sign-in/i,
    );
    await expect(page.getByText(/Jordan Reyes/i)).toHaveCount(0);
    await expect(page.getByText(/Sample preview/i)).toHaveCount(0);
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
  });

  test("dashboard ignores enrollmentId query params for anonymous visitors", async ({
    page,
  }) => {
    const response = await page.goto("dashboard?enrollmentId=recABCDEFGHIJKLMN", {
      waitUntil: "domcontentloaded",
    });
    await expectHealthyResponse(response, "dashboard");
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText).not.toMatch(/\brec[a-zA-Z0-9]{14,}\b/);
    await expect(page.getByText(/Jordan Reyes/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /coming soon|sign-in/i,
    );
    await expect(page.getByTestId("athlete-dashboard-authenticated")).toHaveCount(0);
  });

  test("levels and achievements catalogs render", async ({ page }) => {
    for (const route of ["levels", "achievements"] as const) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectHealthyResponse(response, route);
      await expectSingleHeading(page, route);
    }
  });

  test("homework and zoom catalogs render", async ({ page }) => {
    for (const route of ["homework", "zoom-meetings"] as const) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectHealthyResponse(response, route);
      await expectSingleHeading(page, route);
    }
  });

  test("game manual (rules / program information) renders", async ({
    page,
  }) => {
    const response = await page.goto("game-manual", {
      waitUntil: "domcontentloaded",
    });
    await expectHealthyResponse(response, "game-manual");
    await expectSingleHeading(page, "game-manual");

    // SC-109: approved Adobe Publish Online URL is baked into
    // web/lib/game-manual/config.ts (env override optional). Production must
    // expose Open game manual — not the legacy “coming soon” empty state.
    const openManual = page.getByRole("link", { name: /open game manual/i });
    await expect(openManual).toBeVisible();
    await expect(openManual).toHaveAttribute("href", /^https?:\/\//i);
    await expect(openManual).toHaveAttribute("target", "_blank");
    await expect(openManual).toHaveAttribute(
      "href",
      /indd\.adobe\.com\/view\/|acrobat\.adobe\.com\//i,
    );
    await expect(
      page.getByRole("heading", { name: /official manual link coming soon/i }),
    ).toHaveCount(0);

    await expect(page.locator("main")).not.toContainText(
      /NEXT_PUBLIC_GAME_MANUAL_URL/i,
    );
    await expect(
      page.getByRole("heading", { name: /how you earn xp|level ladder/i }).first(),
    ).toBeVisible();
  });
});

test.describe("production smoke — error and not-found", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("unknown route returns 404 with not-found chrome", async ({ page }) => {
    const response = await page.goto("definitely-not-a-smoke-route", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /not found/i,
    );
  });

  test("missing detail records do not 5xx", async ({ page }) => {
    for (const route of [
      "homework/rec00000000000000",
      "levels/rec00000000000000",
      "zoom-meetings/rec00000000000000",
      "tutorials/rec00000000000000",
    ]) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
    }
  });
});
