import { describe, expect, it } from "vitest";

import { ABOUT_THE_COACH, GIFT_CARD_AWARD_COMMITMENT, OVERVIEW_AWARDS_COACHING } from "./public-program-content";

describe("public program content", () => {
  it("states the program-wide gift card commitment without refund language", () => {
    const serialized = JSON.stringify(GIFT_CARD_AWARD_COMMITMENT).toLowerCase();
    expect(serialized).toMatch(/100%/);
    expect(serialized).toMatch(/registration fees/);
    expect(serialized).toMatch(/program director/);
    expect(serialized).toMatch(/not a guarantee that every individual athlete/);
    expect(serialized).not.toMatch(/refund/);
  });

  it("identifies Mike as coach and program director context without internal jargon", () => {
    const serialized = JSON.stringify(ABOUT_THE_COACH);
    expect(serialized).toMatch(/Mike/);
    expect(serialized).toMatch(/Montana educator/);
    expect(serialized).toMatch(/127 Sports Intensity/);
    expect(serialized).not.toMatch(/Airtable/i);
    expect(serialized).not.toMatch(/Make\.com/i);
    expect(serialized).not.toMatch(/\bWAS\b/);
    expect(serialized).not.toMatch(/\bPHA\b/);
  });

  it("keeps Overview awards/coaching blurbs concise and non-automated", () => {
    expect(OVERVIEW_AWARDS_COACHING.awards).toMatch(/Amazon gift cards/i);
    expect(OVERVIEW_AWARDS_COACHING.awards).toMatch(/Award Recipient/i);
    expect(OVERVIEW_AWARDS_COACHING.awards).toMatch(/not as an automatic payout/i);
    expect(OVERVIEW_AWARDS_COACHING.awards.toLowerCase()).not.toMatch(/instantly|\$\d/);
    expect(OVERVIEW_AWARDS_COACHING.coaching).toMatch(/video feedback/i);
    expect(OVERVIEW_AWARDS_COACHING.coaching).toMatch(/homework review/i);
    expect(OVERVIEW_AWARDS_COACHING.coaching).toMatch(/accountability/i);
  });
});
