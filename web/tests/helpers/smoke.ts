import { expect, type Locator, type Page, type Response } from "@playwright/test";

/** Official public host for Shooting Challenge production smoke. */
export const OFFICIAL_PUBLIC_HOST = "https://www.fairfieldbasketballclub.com";

const PRODUCTION_SMOKE_ATHLETE_SLUG = "perfect-week-testing";
const LOCAL_SMOKE_ATHLETE_SLUG = "testing-schmidt";

function isProductionSmokeTarget(): boolean {
  const base = process.env.PLAYWRIGHT_BASE_URL?.trim() ?? "";
  return base.includes("fairfieldbasketballclub.com");
}

function resolveSmokeAthleteProfilePath(): string {
  const slug = isProductionSmokeTarget()
    ? PRODUCTION_SMOKE_ATHLETE_SLUG
    : LOCAL_SMOKE_ATHLETE_SLUG;
  return `athletes/${slug}`;
}

/** Canonical branded Fillout URLs (must match `lib/registration.ts`). */
export const FILL_OUT = {
  playerRegistration:
    "https://forms.fairfieldbasketballclub.com/shoot-playerregistration",
  dailySubmissions:
    "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
} as const;

/** Landing / logo target used by active production branding. */
export const OFFICIAL_LANDING_URL = "https://www.fairfieldbasketballclub.com";

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

/**
 * Public pages relative to Playwright `baseURL` (`…/shoot/`).
 * Paths are app-relative; Playwright resolves them under `/shoot`.
 */
export const PUBLIC_SMOKE_ROUTES = [
  // Home hero h1 is brand marketing copy (product name lives in chrome / title).
  { name: "home", path: ".", heading: /youth basketball training|daily shooting practice/i },
  { name: "leaderboard", path: "leaderboard", heading: /leaderboard/i },
  { name: "homework", path: "homework", heading: /homework/i },
  { name: "tutorials", path: "tutorials", heading: /skills|tutorial/i },
  { name: "shoutouts", path: "shoutouts", heading: /shout/i },
  { name: "articles", path: "articles", heading: /article/i },
  { name: "levels", path: "levels", heading: /level/i },
  { name: "achievements", path: "achievements", heading: /achievement/i },
  { name: "zoom-meetings", path: "zoom-meetings", heading: /zoom/i },
  { name: "game-manual", path: "game-manual", heading: /game manual|manual/i },
  { name: "public-display", path: "public-display", heading: /season|display|leaderboard|standings/i },
  { name: "dashboard", path: "dashboard", heading: /.+/ },
  { name: "athlete-profile", path: `athletes/${LOCAL_SMOKE_ATHLETE_SLUG}`, heading: /.+/ },
  { name: "admin", path: "admin", heading: /admin/i },
] as const;

/** Smoke routes with environment-aware athlete profile slug. */
export function getPublicSmokeRoutes() {
  const athletePath = resolveSmokeAthleteProfilePath();
  return PUBLIC_SMOKE_ROUTES.map((route) =>
    route.name === "athlete-profile" ? { ...route, path: athletePath } : route,
  );
}

/** Required static assets under `/shoot` (path after basePath). */
export const REQUIRED_ASSETS = [
  "/favicon.ico",
  "/favicon.png",
  "/brand/logo-circle-blue-orange.png",
  "/brand/logo-v1-blue-orange.png",
] as const;

/** Console message types treated as material failures. */
const MATERIAL_CONSOLE_TYPES = new Set(["error"]);

/** Benign console noise that should not fail production smoke. */
const BENIGN_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /Third-party cookie/i,
  /favicon\.ico.*404/i,
  /Failed to load resource: the server responded with a status of 404/i,
  // Expired Airtable cover attachments (known catalog hygiene; SafeExternalImage falls back).
  /Failed to load resource: the server responded with a status of 410/i,
];

export type ConsoleCapture = {
  errors: string[];
  dispose: () => void;
};

/** Attach console listeners; call `dispose` after the assertion. */
export function captureMaterialConsoleErrors(page: Page): ConsoleCapture {
  const errors: string[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (!MATERIAL_CONSOLE_TYPES.has(msg.type())) return;
    const text = msg.text();
    if (BENIGN_CONSOLE_PATTERNS.some((re) => re.test(text))) return;
    errors.push(text);
  };
  const onPageError = (err: Error) => {
    errors.push(err.message);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    errors,
    dispose: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

export async function expectHealthyResponse(
  response: Response | null,
  label: string,
) {
  expect(response, `${label} must return a response`).toBeTruthy();
  const status = response!.status();
  expect(status, `${label} unexpected 404`).not.toBe(404);
  expect(status, `${label} must not 5xx`).toBeLessThan(500);
  expect(status, `${label} should be success or redirect`).toBeLessThan(400);
}

export async function expectSingleHeading(page: Page, label: string) {
  const h1 = page.locator("h1");
  await expect(h1.first(), `${label} must render an h1`).toBeVisible({
    timeout: 30_000,
  });
  await expect(h1, `${label} must have exactly one h1`).toHaveCount(1);
}

type SmokeRoute = {
  name: string;
  path: string;
  heading: RegExp;
};

/**
 * Load a smoke route and require zero material console errors.
 * Production athlete profiles on the canonical Fairfield host can briefly
 * serve mixed edge HTML/JS; retry until a clean load succeeds.
 */
export async function expectRouteLoadsWithCleanConsole(
  page: Page,
  route: SmokeRoute,
) {
  const waitUntil = route.name === "athlete-profile" ? "load" : "domcontentloaded";
  const retry =
    route.name === "athlete-profile" && isProductionSmokeTarget();

  const assertOnce = async () => {
    const consoleCapture = captureMaterialConsoleErrors(page);
    try {
      const response = await page.goto(route.path, { waitUntil });
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
  };

  if (retry) {
    await expect(assertOnce).toPass({ timeout: 45_000 });
  } else {
    await assertOnce();
  }
}

/**
 * Open the client-rendered mobile nav panel.
 *
 * ProductNav is a `"use client"` control. On production, `domcontentloaded`
 * can finish before React hydration attaches click handlers, so a single click
 * may no-op. Retry until `aria-expanded` flips and the dialog mounts.
 */
export async function openMobileNavPanel(page: Page): Promise<{
  toggle: Locator;
  panel: Locator;
}> {
  const toggle = page.getByTestId("mobile-nav-toggle");
  const panel = page.getByTestId("mobile-nav-panel");

  await expect(toggle).toBeVisible();

  await expect(async () => {
    const expanded = await toggle.getAttribute("aria-expanded");
    if (expanded !== "true") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }).toPass({ timeout: 15_000 });

  await expect(panel).toBeVisible();
  return { toggle, panel };
}

/** Collect same-origin hrefs that incorrectly duplicate `/shoot/shoot`. */
export async function findDuplicatedBasePaths(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    const nodes = Array.from(
      document.querySelectorAll<HTMLAnchorElement | HTMLImageElement | HTMLLinkElement>(
        "a[href], img[src], link[href], script[src]",
      ),
    );
    for (const el of nodes) {
      const value =
        "href" in el && typeof el.href === "string"
          ? el.getAttribute("href") || el.href
          : el.getAttribute("src") || "";
      if (!value) continue;
      if (value.includes("/shoot/shoot")) bad.push(value);
    }
    return bad;
  });
}

/** Collect target=_blank anchors missing noopener/noreferrer. */
export async function findUnsafeBlankTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[target="_blank"]'))
      .filter((a) => {
        const rel = (a.getAttribute("rel") || "").toLowerCase();
        return !rel.includes("noopener") && !rel.includes("noreferrer");
      })
      .map((a) => (a as HTMLAnchorElement).href);
  });
}

/** Internal nav destinations that 404 or 5xx when fetched as navigation. */
export async function collectInternalNavHrefs(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nav = document.querySelector(
      'nav[aria-label="Shooting Challenge navigation"]',
    );
    if (!nav) return [];
    return Array.from(nav.querySelectorAll("a[href]"))
      .map((a) => (a as HTMLAnchorElement).getAttribute("href") || "")
      .filter((href) => href.startsWith("/") || href.startsWith("./") || !/^https?:/i.test(href));
  });
}
