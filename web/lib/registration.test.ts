import { describe, expect, it } from "vitest";

import {
  DAILY_SUBMISSIONS,
  PLAYER_REGISTRATION,
  REGISTRATION_LINKS,
  isRegistrationUrl,
} from "./registration";

describe("registration links", () => {
  it("exposes exact Player Registration URL and CTA", () => {
    expect(PLAYER_REGISTRATION.label).toBe("Player Registration");
    expect(PLAYER_REGISTRATION.cta).toBe("Register for the Challenge");
    expect(PLAYER_REGISTRATION.url).toBe(
      "https://forms.fairfieldbasketballclub.com/shoot-playerregistration",
    );
  });

  it("exposes exact Daily Submissions URL and CTA", () => {
    expect(DAILY_SUBMISSIONS.label).toBe("Already Registered?");
    expect(DAILY_SUBMISSIONS.cta).toBe("Submit Today's Activity");
    expect(DAILY_SUBMISSIONS.url).toBe(
      "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
    );
  });

  it("keeps registration before daily submissions in gateway order", () => {
    expect(REGISTRATION_LINKS.map((link) => link.id)).toEqual([
      "player-registration",
      "daily-submissions",
    ]);
  });

  it("recognizes canonical registration URLs only", () => {
    expect(isRegistrationUrl(PLAYER_REGISTRATION.url)).toBe(true);
    expect(isRegistrationUrl(DAILY_SUBMISSIONS.url)).toBe(true);
    expect(isRegistrationUrl("https://example.com")).toBe(false);
  });
});
