import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  captureMaterialConsoleErrors,
  expectHealthyResponse,
  VIEWPORTS,
} from "./helpers/smoke";

const ATTACHMENT_HOST = /airtableusercontent\.com/i;

type ContrastSample = {
  color: string;
  background: string;
  ratio: number | null;
};

async function sampleContrast(locator: Locator): Promise<ContrastSample & { ratio: number | null }> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    let background = style.backgroundColor;
    let node: HTMLElement | null = el.parentElement;
    while (node && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
      background = getComputedStyle(node).backgroundColor;
      node = node.parentElement;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    const toRgb = (value: string): [number, number, number] | null => {
      if (!ctx) return null;
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2]];
    };

    const fg = toRgb(style.color);
    const bg = toRgb(background);
    if (!fg || !bg) {
      return { color: style.color, background, ratio: null };
    }

    const toLinear = (channel: number) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = (rgb: [number, number, number]) =>
      0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
    const l1 = lum(fg);
    const l2 = lum(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return {
      color: style.color,
      background,
      ratio: (lighter + 0.05) / (darker + 0.05),
    };
  });
}

async function expectReadable(locator: Locator, label: string) {
  await expect(locator, label).toBeVisible();
  const sample = await sampleContrast(locator);
  expect(sample.ratio, `${label} contrast ${sample.color} on ${sample.background}`).not.toBeNull();
  expect(sample.ratio!, `${label} must be at least 4.5:1`).toBeGreaterThanOrEqual(4.5);
}

async function openFirstInternalCard(page: Page, listingPath: string) {
  const response = await page.goto(listingPath, { waitUntil: "domcontentloaded" });
  await expectHealthyResponse(response, listingPath);
  const cards = page.locator("a:has(article)");
  const count = await cards.count();
  if (count === 0) return { opened: false as const };

  for (let i = 0; i < count; i += 1) {
    const href = (await cards.nth(i).getAttribute("href")) || "";
    if (/^https?:/i.test(href)) continue;
    await Promise.all([
      page.waitForURL(/\/(tutorials|shoutouts)\/rec/i),
      cards.nth(i).click(),
    ]);
    await expect(page.locator("h1")).toBeVisible();
    return { opened: true as const };
  }

  return { opened: false as const };
}

function assertPlayerUsesCanonical(canonical: string, playerSrc: string, mode: string | null) {
  expect(playerSrc, "player must not use an Airtable attachment URL").not.toMatch(ATTACHMENT_HOST);
  expect(canonical, "canonical URL must come from Link to Video").toMatch(/^https?:\/\//i);
  expect(canonical).not.toMatch(ATTACHMENT_HOST);

  if (mode === "embed") {
    const youtubeId = canonical.match(/(?:youtu\.be\/|v=)([\w-]{6,})/i)?.[1];
    const vimeoId = canonical.match(/vimeo\.com\/(\d+)/i)?.[1];
    if (youtubeId) {
      expect(playerSrc).toContain(youtubeId);
      expect(playerSrc).toMatch(/youtube-nocookie\.com\/embed\//);
    } else if (vimeoId) {
      expect(playerSrc).toContain(vimeoId);
    }
    return;
  }

  const normalizedPlayer = decodeURI(playerSrc);
  const normalizedCanonical = decodeURI(canonical);
  expect(normalizedPlayer.startsWith(normalizedCanonical.split("#")[0])).toBeTruthy();
}

test.describe("tutorials and shoutouts video + readability", () => {
  test.describe("desktop 1440", () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test("tutorials listing loads with readable chrome", async ({ page }) => {
      const consoleCapture = captureMaterialConsoleErrors(page);
      const failed: string[] = [];
      page.on("response", (res) => {
        if (res.status() >= 400 && !/favicon|airtableusercontent/i.test(res.url())) {
          failed.push(`${res.status()} ${res.url()}`);
        }
      });

      const response = await page.goto("tutorials", { waitUntil: "domcontentloaded" });
      await expectHealthyResponse(response, "tutorials listing");
      await expect(page.locator("h1")).toHaveCount(1);
      await expectReadable(page.locator("h1").first(), "tutorials h1");
      await expectReadable(page.getByRole("contentinfo").locator("p").first(), "footer text");
      await expectReadable(
        page.getByRole("navigation", { name: "Shooting Challenge navigation" }).locator("a").first(),
        "nav link",
      );

      const withVideo = page.locator("article[data-has-video='true']");
      if ((await withVideo.count()) > 0) {
        const canonical = await withVideo.first().getAttribute("data-canonical-video-url");
        expect(canonical).toMatch(/^https?:\/\//i);
        expect(canonical, "listing card must not use an attachment URL").not.toMatch(ATTACHMENT_HOST);
      }

      const withoutVideo = page.locator("article[data-has-video='false']");
      if ((await withoutVideo.count()) > 0) {
        await expect(withoutVideo.first().getByText(/coming soon/i)).toBeVisible();
      }

      consoleCapture.dispose();
      expect(consoleCapture.errors, consoleCapture.errors.join("\n")).toEqual([]);
      expect(failed.filter((row) => /\/shoot\//.test(row) && !/410/.test(row))).toEqual([]);
    });

    test("shoutouts listing loads with readable chrome", async ({ page }) => {
      const consoleCapture = captureMaterialConsoleErrors(page);
      const response = await page.goto("shoutouts", { waitUntil: "domcontentloaded" });
      await expectHealthyResponse(response, "shoutouts listing");
      await expect(page.locator("h1")).toHaveCount(1);
      await expectReadable(page.locator("h1").first(), "shoutouts h1");
      consoleCapture.dispose();
      expect(consoleCapture.errors).toEqual([]);
    });

    test("tutorial and shoutout details use Link to Video or the empty state", async ({ page }) => {
      for (const listing of ["tutorials", "shoutouts"] as const) {
        const opened = await openFirstInternalCard(page, listing);
        if (!opened.opened) continue;

        await expect(page.locator("h1")).toBeVisible();

        const empty = page.locator("[data-video-empty]");
        const player = page.locator("[data-canonical-video-url]").first();

        if ((await empty.count()) > 0) {
          await expect(empty).toBeVisible();
          await expect(empty).toContainText(/coming soon/i);
          await expect(page.locator("iframe, video")).toHaveCount(0);
          continue;
        }

        await expect(player).toBeVisible();
        const canonical = await player.getAttribute("data-canonical-video-url");
        const mode = await player.getAttribute("data-video-mode");
        expect(canonical).toBeTruthy();

        const iframe = page.locator("iframe").first();
        const video = page.locator("video").first();
        const openLink = page.locator("[data-canonical-video-url] a[href], a[data-canonical-video-url]").first();

        if ((await iframe.count()) > 0) {
          const src = (await iframe.getAttribute("src")) || "";
          assertPlayerUsesCanonical(canonical!, src, mode);
        } else if ((await video.count()) > 0) {
          const src = (await video.getAttribute("src")) || "";
          assertPlayerUsesCanonical(canonical!, src, mode);
        } else {
          await expect(openLink).toBeVisible();
          const href = await openLink.getAttribute("href");
          expect(href).toBe(canonical);
          expect(href).not.toMatch(ATTACHMENT_HOST);
        }
      }
    });
  });

  test.describe("mobile 375", () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test("tutorials and shoutouts remain readable without overflow", async ({ page }) => {
      for (const path of ["tutorials", "shoutouts"] as const) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("h1")).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(20);

        const menu = page.getByTestId("mobile-nav-toggle");
        if (await menu.isVisible()) {
          await menu.click();
          const panel = page.getByTestId("mobile-nav-panel");
          await expect(panel).toBeVisible();
          await expectReadable(panel.locator("a").first(), `${path} mobile nav`);
          await page.getByTestId("mobile-nav-close").click();
        }
      }
    });
  });
});
