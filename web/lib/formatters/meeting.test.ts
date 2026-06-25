import { describe, expect, it } from "vitest";

import { formatMeetingDateTime } from "@/lib/formatters";

describe("formatMeetingDateTime", () => {
  it("formats valid ISO timestamps", () => {
    const formatted = formatMeetingDateTime("2026-06-10T18:00:00.000Z");
    expect(formatted).not.toBe("Date TBD");
    expect(formatted).toContain("Jun");
  });

  it("returns fallback for missing values", () => {
    expect(formatMeetingDateTime(null)).toBe("Date TBD");
  });
});
