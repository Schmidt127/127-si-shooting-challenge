import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const phase = process.env.SCREENSHOT_PHASE === "after" ? "after" : "before";
const outDir = path.join(process.cwd(), "test-results", "landing-redesign", phase);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:3001/shoot", { waitUntil: "networkidle" });
await page.waitForSelector("h1");
await page.screenshot({
  path: path.join(outDir, "desktop.png"),
  fullPage: true,
});

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:3001/shoot", { waitUntil: "networkidle" });
await page.waitForSelector("h1");
await page.screenshot({
  path: path.join(outDir, "mobile.png"),
  fullPage: true,
});

await browser.close();
console.log(`Saved ${phase} screenshots to ${outDir}`);
