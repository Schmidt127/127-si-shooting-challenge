import { describe, expect, it } from "vitest";

import { PROGRAM_FAQ_ITEMS } from "./faq-content";

describe("PROGRAM_FAQ_ITEMS", () => {
  it("covers required FAQ topics", () => {
    const serialized = JSON.stringify(PROGRAM_FAQ_ITEMS).toLowerCase();
    expect(serialized).toMatch(/grades/);
    expect(serialized).toMatch(/boys and girls/);
    expect(serialized).toMatch(/educational athletics/);
    expect(serialized).toMatch(/early bird/);
    expect(serialized).toMatch(/may 1/);
    expect(serialized).toMatch(/daily/);
    expect(serialized).toMatch(/homework/);
    expect(serialized).toMatch(/xp/);
    expect(serialized).toMatch(/video feedback/);
    expect(serialized).toMatch(/zoom/);
    expect(serialized).toMatch(/privacy|publicly/);
    expect(serialized).toMatch(/fairfield/);
    expect(serialized).toMatch(/register/);
    expect(serialized).toMatch(/gift card/);
    expect(serialized).toMatch(/program director/);
  });

  it("explains gift card commitment as program-wide and discretionary", () => {
    const giftCard = PROGRAM_FAQ_ITEMS.find((item) => item.id === "gift-card-commitment");
    expect(giftCard?.answer).toMatch(/100%/);
    expect(giftCard?.answer).toMatch(/not a guarantee that every individual athlete/i);
    expect(giftCard?.answer.toLowerCase()).not.toMatch(/refund/);
  });

  it("points XP progress to public leaderboard, not the demo dashboard", () => {
    const xp = PROGRAM_FAQ_ITEMS.find((item) => item.id === "xp-progress");
    expect(xp?.answer).toMatch(/leaderboard/i);
    expect(xp?.answer.toLowerCase()).not.toContain("dashboard");
  });

  it("explains online participation without internal jargon", () => {
    const remote = PROGRAM_FAQ_ITEMS.find((item) => item.id === "remote-access");
    expect(remote?.answer).toMatch(/100% online/i);
    expect(remote?.answer).not.toMatch(/Airtable/i);
    expect(remote?.answer).not.toMatch(/Make\.com/i);
    expect(remote?.answer).not.toMatch(/;/);
  });

  it("sets appropriate coach feedback expectations", () => {
    const video = PROGRAM_FAQ_ITEMS.find((item) => item.id === "video-feedback");
    expect(video?.answer).toMatch(/coaches review/i);
    expect(video?.answer).toMatch(/not an on-demand private lesson/i);
  });

  it("does not mention Team Shot Tracker (separate product)", () => {
    const serialized = JSON.stringify(PROGRAM_FAQ_ITEMS).toLowerCase();
    expect(serialized).not.toMatch(/team shot tracker/);
    expect(serialized).not.toMatch(/shot tracker/);
  });

  it("does not expose parent emails or Airtable record ids", () => {
    const serialized = JSON.stringify(PROGRAM_FAQ_ITEMS);
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/rec[a-zA-Z0-9]{14}/);
  });

  it("has unique question ids", () => {
    const ids = PROGRAM_FAQ_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
