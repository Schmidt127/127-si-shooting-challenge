import { expect, test } from "@playwright/test";

import {
  DAILY_SUBMISSIONS,
  PLAYER_REGISTRATION,
} from "../lib/registration";

/**
 * Homepage registration gateway — branded Fillout form CTAs below the hero.
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
      section.getByRole("heading", { name: "Ready to Join the Shooting Challenge?" }),
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

  test("places registration gateway between hero and Why it works", async ({
    page,
  }) => {
    await page.goto(".", { waitUntil: "domcontentloaded" });

    const order = await page.evaluate(() => {
      const hero = document.querySelector("h1");
      const registration = document.querySelector("#registration-gateway");
      const why = Array.from(document.querySelectorAll("p, span")).find((el) =>
        /Why it works/i.test(el.textContent || ""),
      );
      if (!hero || !registration || !why) {
        return {
          ok: false,
          reason: `missing ${!hero ? "hero" : ""} ${!registration ? "registration" : ""} ${!why ? "why" : ""}`.trim(),
        };
      }
      const position = hero.compareDocumentPosition(registration);
      const afterHero = (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const beforeWhy =
        (registration.compareDocumentPosition(why) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0;
      return { ok: afterHero && beforeWhy, afterHero, beforeWhy };
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
