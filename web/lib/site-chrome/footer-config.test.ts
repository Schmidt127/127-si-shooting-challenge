import { describe, expect, it } from "vitest";

import { LANDING_URL } from "@/lib/app-config";
import { DAILY_SUBMISSIONS, PLAYER_REGISTRATION } from "@/lib/registration";
import {
  FOOTER_CONSENT_COPY,
  FOOTER_QUICK_LINKS,
  FOOTER_REGISTRATION_LINKS,
} from "@/lib/site-chrome/footer-config";

describe("footer configuration", () => {
  it("includes core public program destinations", () => {
    const hrefs = FOOTER_QUICK_LINKS.map((item) => item.href);
    expect(hrefs).toContain("/leaderboard");
    expect(hrefs).toContain("/homework");
    expect(hrefs).toContain("/levels");
    expect(hrefs).toContain("/achievements");
    expect(hrefs).toContain("/faq");
    expect(hrefs).toContain("/zoom-meetings");
  });

  it("uses canonical Fillout registration URLs", () => {
    expect(FOOTER_REGISTRATION_LINKS.map((item) => item.href)).toEqual([
      PLAYER_REGISTRATION.url,
      DAILY_SUBMISSIONS.url,
    ]);
  });

  it("documents consent boundaries without personal contact data", () => {
    expect(FOOTER_CONSENT_COPY.toLowerCase()).toContain("registration");
    expect(FOOTER_CONSENT_COPY.toLowerCase()).toContain("never published");
    expect(FOOTER_CONSENT_COPY).not.toMatch(/@/);
    expect(LANDING_URL).toContain("fairfieldbasketballclub.com");
  });
});
