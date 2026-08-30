/**
 * Component-chrome contract tests for logo / header / footer landing links.
 * These assert the shared LANDING_URL + copy used by SiteHeader / SiteFooter /
 * BackToHubLink without requiring a browser.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LANDING_URL,
  PUBLIC_LANDING_ORIGIN,
  PUBLIC_SITE_ORIGIN,
  SITE_URL,
} from "./app-config";

const webRoot = join(__dirname, "..");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("site chrome landing links", () => {
  it("exports LANDING_URL pointing at the official Fairfield landing", () => {
    expect(LANDING_URL).toBe(PUBLIC_LANDING_ORIGIN);
    expect(LANDING_URL).toBe("https://www.fairfieldbasketballclub.com");
    expect(LANDING_URL).not.toMatch(/hoopchallenges/i);
  });

  it("keeps /shoot application origin separate from the landing origin", () => {
    expect(PUBLIC_SITE_ORIGIN).toBe("https://www.fairfieldbasketballclub.com/shoot");
    expect(PUBLIC_SITE_ORIGIN.startsWith(PUBLIC_LANDING_ORIGIN)).toBe(true);
    expect(PUBLIC_SITE_ORIGIN.endsWith("/shoot")).toBe(true);
  });

  it("header logo and wordmark links use LANDING_URL (not an in-app route)", () => {
    const header = readSource("components/site/site-header.tsx");
    expect(header).toContain('href={LANDING_URL}');
    expect(header).toContain("Fairfield Basketball Club home");
    expect(header).not.toMatch(/hoopchallenges\.com/i);
    expect(header).not.toContain("Hoop Challenges home");
  });

  it("footer branding link uses LANDING_URL with Fairfield copy", () => {
    const footer = readSource("components/site/site-footer.tsx");
    expect(footer).toContain('href={LANDING_URL}');
    expect(footer).toContain("Fairfield Basketball Club home");
    expect(footer).not.toContain("Hoop Challenges home");
    expect(footer).not.toMatch(/hoopchallenges\.com/i);
  });

  it("footer exposes registration links and consent copy", () => {
    const footer = readSource("components/site/site-footer.tsx");
    expect(footer).toContain("FOOTER_REGISTRATION_LINKS");
    expect(footer).toContain("FOOTER_CONSENT_COPY");
    expect(footer).toContain('rel="noopener noreferrer"');
    expect(footer).toContain('href="/faq"');
  });

  it("BackToHubLink Home control uses LANDING_URL", () => {
    const hub = readSource("components/layout/back-to-hub-link.tsx");
    expect(hub).toContain('href={LANDING_URL}');
    expect(hub).toMatch(/>\s*Home\s*</);
    expect(hub).not.toMatch(/hoopchallenges\.com/i);
  });

  it("exports SITE_URL for metadataBase on Fairfield /shoot", () => {
    expect(SITE_URL).toBe(PUBLIC_SITE_ORIGIN);
    expect(SITE_URL).not.toMatch(/hoopchallenges/i);
  });

  it("metadata site URL defaults do not reference Hoop Challenges", () => {
    const layout = readSource("app/layout.tsx");
    expect(layout).toContain("SITE_URL");
    expect(layout).not.toMatch(/hoopchallenges\.com/i);
  });

  it("active env examples use Fairfield defaults", () => {
    for (const relative of [".env.example", ".env.local.example"]) {
      const env = readSource(relative);
      expect(env).toContain(
        "NEXT_PUBLIC_LANDING_URL=https://www.fairfieldbasketballclub.com",
      );
      expect(env).toContain(
        "NEXT_PUBLIC_SITE_URL=https://www.fairfieldbasketballclub.com/shoot",
      );
      expect(env).not.toMatch(/hoopchallenges\.com/i);
    }
  });
});
