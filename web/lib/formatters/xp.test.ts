import { describe, expect, it } from "vitest";

import {
  formatRelativeUpdate,
  formatShots,
  formatXp,
  formatXpSourceLabel,
} from "@/lib/formatters";

describe("formatXpSourceLabel", () => {
  it("maps legacy aliases to V2 XP Source labels", () => {
    expect(formatXpSourceLabel("Video Feedback")).toBe("Video Submission");
    expect(formatXpSourceLabel("submission")).toBe("Submission Base");
    expect(formatXpSourceLabel("Homework")).toBe("Homework Completion");
    expect(formatXpSourceLabel("Zoom Recording")).toBe("Zoom Recording");
    expect(formatXpSourceLabel("Perfect Week")).toBe("Perfect Week");
    expect(formatXpSourceLabel("Shot Milestone")).toBe("Shot Milestone");
  });

  it("handles empty and unknown values safely", () => {
    expect(formatXpSourceLabel("")).toBe("XP");
    expect(formatXpSourceLabel(null)).toBe("XP");
    expect(formatXpSourceLabel("Custom Coach Bonus")).toBe("Custom Coach Bonus");
  });
});

describe("formatRelativeUpdate", () => {
  it("formats valid timestamps", () => {
    const formatted = formatRelativeUpdate("2026-07-14T18:30:00.000Z");
    expect(formatted).toContain("Jul");
    expect(formatted).not.toBe("Updated recently");
  });

  it("guards null and invalid dates", () => {
    expect(formatRelativeUpdate(null)).toBe("Updated recently");
    expect(formatRelativeUpdate("")).toBe("Updated recently");
    expect(formatRelativeUpdate("not-a-date")).toBe("Updated recently");
  });
});

describe("numeric formatters", () => {
  it("guards non-finite XP and shots", () => {
    expect(formatXp(Number.NaN)).toBe("0");
    expect(formatShots(Number.POSITIVE_INFINITY)).toBe("0");
  });
});
