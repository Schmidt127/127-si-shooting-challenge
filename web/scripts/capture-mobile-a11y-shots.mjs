/**
 * One-off browser verification screenshots for the mobile/a11y package.
 * Requires a running next start on PLAYWRIGHT_PORT (default 3001).
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PLAYWRIGHT_PORT || 3001);
const base = `http://127.0.0.1:${port}/shoot/`;
const outDir = "/opt/cursor/artifacts/screenshots/mobile-a11y";
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  { name: "home-375", path: ".", width: 375, height: 812 },
  { name: "home-375-menu-open", path: ".", width: 375, height: 812, openMenu: true },
  { name: "home-768", path: ".", width: 768, height: 1024 },
  { name: "home-1440", path: ".", width: 1440, height: 900 },
  { name: "leaderboard-375", path: "leaderboard", width: 375, height: 812 },
  { name: "dashboard-375", path: "dashboard", width: 375, height: 812 },
];

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
  });
  await page.goto(new URL(shot.path, base).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  if (shot.openMenu) {
    await page.getByTestId("mobile-nav-toggle").click();
    await page.getByTestId("mobile-nav-panel").waitFor({ state: "visible" });
  }
  const file = path.join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
  await page.close();
}
await browser.close();
console.log("done");
