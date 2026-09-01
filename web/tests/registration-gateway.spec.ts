import { expect, test } from "@playwright/test";

import {
  DAILY_SUBMISSIONS,
  PLAYER_REGISTRATION,
} from "../lib/registration";

/**
 * Homepage registration gateway — branded Fillout form CTAs near the top of the page.
 */

test.describe("homepage registration gateway", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders both CTAs with exact URLs and external-link attributes", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    const section = page.locator("#registration-gateway");
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(
      section.getByRole("heading", { name: /Ready to join the 2026–2027 Shooting Challenge/i }),
    ).toBeVisible();

    const register = section.getByRole("link", {
      name: /Register for the Challenge/i,
    });
    await expect(register).toBeVisible();
    await expect(register).toHaveAttribute("href", PLAYER_REGISTRATION.url);
    await expect(register).toHaveAttribute("target", "_blank");
    await expect(register).toHaveAttribute("rel", /noopener/);
    await expect(register).toHaveAttribute("rel", /noreferrer/);
    await expect(register).toHaveAttribute(
      "aria-label",
      `${PLAYER_REGISTRATION.cta} (opens in a new tab)`,
    );

    const submit = section.getByRole("link", {
      name: /Submit Today's Activity/i,
    });
    await expect(submit).toBeVisible();
    await expect(submit).toHaveAttribute("href", DAILY_SUBMISSIONS.url);
    await expect(submit).toHaveAttribute("target", "_blank");
    await expect(submit).toHaveAttribute("rel", /noopener/);
    await expect(submit).toHaveAttribute("rel", /noreferrer/);
    await expect(submit).toHaveAttribute(
      "aria-label",
      `${DAILY_SUBMISSIONS.cta} (opens in a new tab)`,
    );
  });

  test("places registration gateway near the top of the page", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    const order = await page.evaluate(() => {
      const hero = document.querySelector("h1");
      const registration = document.querySelector("#registration-gateway");
      const whatIs = Array.from(document.querySelectorAll("h2")).find((el) =>
        /What is the Shooting Challenge/i.test(el.textContent || ""),
      );
      if (!hero || !registration || !whatIs) {
        return {
          ok: false,
          reason: `missing ${!hero ? "hero" : ""} ${!registration ? "registration" : ""} ${!whatIs ? "what-is" : ""}`.trim(),
        };
      }
      const afterHero =
        (hero.compareDocumentPosition(registration) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const beforeWhatIs =
        (registration.compareDocumentPosition(whatIs) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      return { ok: afterHero && beforeWhatIs, afterHero, beforeWhatIs };
    });

    expect(order.ok, JSON.stringify(order)).toBeTruthy();
  });

  test("registration CTAs expose visible keyboard focus styles", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const register = page
      .locator("#registration-gateway")
      .getByRole("link", { name: /Register for the Challenge/i });
    await register.focus();
    await expect(register).toBeFocused();

    const outline = await register.evaluate((el) => {
      const styles = getComputedStyle(el);
      return {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });
    const hasFocusCue =
      (outline.outlineStyle !== "none" && outline.outlineWidth !== "0px") ||
      (outline.boxShadow !== "none" && outline.boxShadow.length > 0);
    expect(hasFocusCue, JSON.stringify(outline)).toBeTruthy();
  });
});

test.describe("homepage registration gateway (mobile)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("gateway CTAs remain visible without horizontal overflow", async ({ page }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });
    const section = page.locator("#registration-gateway");
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(
      section.getByRole("link", { name: /Register for the Challenge/i }),
    ).toBeVisible();
    await expect(
      section.getByRole("link", { name: /Submit Today's Activity/i }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(8);
  });
});
