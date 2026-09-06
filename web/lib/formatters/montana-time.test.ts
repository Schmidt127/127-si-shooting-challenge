import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  formatMontanaDateOnly,
  formatMontanaDateTime,
  montanaDateKey,
  MONTANA_TIME_ZONE,
  MONTANA_TIME_ZONE_LABEL,
} from "@/lib/formatters/montana-time";

describe("montanaDateKey", () => {
  it("uses America/Denver calendar day near UTC midnight", () => {
    // 2026-03-08 05:30Z = still March 7 evening in Denver (MST)
    expect(montanaDateKey(new Date("2026-03-08T05:30:00.000Z"))).toBe("2026-03-07");
    // 2026-03-08 07:30Z = March 8 morning MDT after spring forward
    expect(montanaDateKey(new Date("2026-03-08T07:30:00.000Z"))).toBe("2026-03-08");
  });
});

describe("formatMontanaDateTime", () => {
  it("formats instants in America/Denver with a fixed MT label", () => {
    const winter = formatMontanaDateTime("2026-01-15T20:00:00.000Z");
    expect(winter).toContain("Jan");
    expect(winter).toContain(MONTANA_TIME_ZONE_LABEL);
    expect(winter).not.toMatch(/\bMST\b|\bMDT\b/);

    const summer = formatMontanaDateTime("2026-07-14T18:30:00.000Z");
    expect(summer).toContain("Jul");
    expect(summer?.endsWith(` ${MONTANA_TIME_ZONE_LABEL}`)).toBe(true);
  });

  it("returns null for invalid values", () => {
    expect(formatMontanaDateTime(null)).toBeNull();
    expect(formatMontanaDateTime("")).toBeNull();
    expect(formatMontanaDateTime("not-a-date")).toBeNull();
  });
});

describe("formatMontanaDateOnly", () => {
  it("does not shift date-only keys across timezones", () => {
    expect(formatMontanaDateOnly("2026-06-07")).toMatch(/Jun(?:e)? 7, 2026/);
    expect(formatMontanaDateOnly("2027-06-29")).toMatch(/Jun(?:e)? 29, 2027/);
  });

  it("returns null for invalid keys", () => {
    expect(formatMontanaDateOnly(null)).toBeNull();
    expect(formatMontanaDateOnly("06/07/2026")).toBeNull();
  });
});

describe("addCalendarDays", () => {
  it("crosses month boundaries without timezone drift", () => {
    expect(addCalendarDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(addCalendarDays("2026-03-08", 0)).toBe("2026-03-08");
  });
});

describe("constants", () => {
  it("locks Montana display timezone + label", () => {
    expect(MONTANA_TIME_ZONE).toBe("America/Denver");
    expect(MONTANA_TIME_ZONE_LABEL).toBe("MT");
  });
});
