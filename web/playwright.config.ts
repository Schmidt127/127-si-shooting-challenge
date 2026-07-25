import { defineConfig, devices } from "@playwright/test";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/shoot";
const port = Number(process.env.PLAYWRIGHT_PORT || 3001);
/** Trailing slash required so relative navigations stay under basePath. */
const localBaseURL = `http://127.0.0.1:${port}${basePath}/`;
/** Optional override for live PROD/preview runs, e.g. PLAYWRIGHT_BASE_URL=https://www.hoopchallenges.com/shoot/ */
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = externalBaseURL
  ? externalBaseURL.endsWith("/")
    ? externalBaseURL
    : `${externalBaseURL}/`
  : localBaseURL;

/**
 * Playwright config for the Shooting Challenge Next.js app (`basePath` /shoot).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          /**
           * Prefer an already-running server during local redesign work.
           * Using `next dev` here can overwrite a production `.next` build mid-session.
           */
          command: `npx next start -p ${port}`,
          url: localBaseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
