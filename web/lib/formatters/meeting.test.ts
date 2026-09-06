import { describe, expect, it } from "vitest";

import { formatMeetingDateTime } from "@/lib/formatters";
import { MONTANA_TIME_ZONE_LABEL } from "@/lib/formatters/montana-time";

describe("formatMeetingDateTime", () => {
  it("formats valid ISO timestamps with MT", () => {
    const formatted = formatMeetingDateTime("2026-06-10T18:00:00.000Z");
    expect(formatted).not.toBe("Date TBD");
    expect(formatted).toContain("Jun");
    expect(formatted).toContain(MONTANA_TIME_ZONE_LABEL);
    expect(formatted).not.toMatch(/\bMST\b|\bMDT\b/);
  });

  it("returns fallback for missing values", () => {
    expect(formatMeetingDateTime(null)).toBe("Date TBD");
  });
});
