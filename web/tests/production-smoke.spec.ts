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
  PUBLIC_SMOKE_ROUTES,
  REQUIRED_ASSETS,
  VIEWPORTS,
  captureMaterialConsoleErrors,
  expectHealthyResponse,
  expectSingleHeading,
  findDuplicatedBasePaths,
  findUnsafeBlankTargets,
} from "./helpers/smoke";

test.describe("production smoke — desktop routes", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  for (const route of PUBLIC_SMOKE_ROUTES) {
    test(`${route.name} loads with heading and no material console errors`, async ({
      page,
    }) => {
      const consoleCapture = captureMaterialConsoleErrors(page);
      try {
        const response = await page.goto(route.path, {
          waitUntil: "domcontentloaded",
        });
        await expectHealthyResponse(response, route.name);
        await expectSingleHeading(page, route.name);
        await expect(page.locator("h1").first()).toContainText(route.heading);
        expect(
          consoleCapture.errors,
          `${route.name} console errors: ${consoleCapture.errors.join(" | ")}`,
        ).toEqual([]);
      } finally {
        consoleCapture.dispose();
      }
    });
  }
});

test.describe("production smoke — mobile routes", () => {
  test.use({ viewport: VIEWPORTS.mobile });

  for (const route of PUBLIC_SMOKE_ROUTES) {
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

test.describe("production smoke — navigation, assets, basePath", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("program nav links resolve without 404/5xx", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", {
      name: "Shooting Challenge navigation",
    });
    await expect(nav).toBeVisible();

    // Primary strip only — Dashboard / Achievements / Display live under More.
    const primaryLabels = [
      "Leaderboard",
      "Homework",
      "Levels",
      "Zoom Meetings",
      "Game Manual",
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

    await nav.getByRole("button", { name: /More/i }).click();
    for (const moreLabel of ["Dashboard", "Achievements", "Display"]) {
      await expect(
        page.getByRole("menuitem", { name: moreLabel }),
        `More menu item ${moreLabel}`,
      ).toBeVisible();
    }
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

  test("athlete dashboard shows weekly summary and video feedback sections", async ({
    page,
  }) => {
    const response = await page.goto("dashboard", {
      waitUntil: "domcontentloaded",
    });
    await expectHealthyResponse(response, "dashboard");
    await expectSingleHeading(page, "dashboard");
    await expect(page.getByText(/Weekly summary/i).first()).toBeVisible();
    await expect(page.getByText(/Video feedback/i).first()).toBeVisible();
    await expect(page.getByText(/Homework/i).first()).toBeVisible();
    // Dashboard remains demo until SC-112 auth — smoke accepts demo labels.
    await expect(page.getByText(/Demo|demo/i).first()).toBeVisible();
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
