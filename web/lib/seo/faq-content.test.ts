import { describe, expect, it } from "vitest";

import { PROGRAM_FAQ_ITEMS } from "./faq-content";

describe("PROGRAM_FAQ_ITEMS", () => {
  it("covers required FAQ topics", () => {
    const serialized = JSON.stringify(PROGRAM_FAQ_ITEMS).toLowerCase();
    expect(serialized).toMatch(/grades/);
    expect(serialized).toMatch(/boys and girls/);
    expect(serialized).toMatch(/educational athletics/);
    expect(serialized).toMatch(/daily/);
    expect(serialized).toMatch(/xp/);
    expect(serialized).toMatch(/video feedback/);
    expect(serialized).toMatch(/zoom/);
    expect(serialized).toMatch(/fairfield/);
    expect(serialized).toMatch(/register/);
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
