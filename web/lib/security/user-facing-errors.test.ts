import { describe, expect, it, vi } from "vitest";

import { XpActivityLoadError } from "@/lib/data/xp-activity-loader";
import {
  DASHBOARD_GENERIC_UNAVAILABLE,
  sanitizePublicText,
  xpActivityPublicErrorMessage,
} from "@/lib/security/user-facing-errors";

describe("user-facing dashboard errors", () => {
  it("sanitizes enrollment record ids from diagnostic text", () => {
    const sanitized = sanitizePublicText(
      'Invalid enrollment record id: "recABCDEFGHIJKLMN"',
    );
    expect(sanitized).not.toContain("recABCDEFGHIJKLMN");
    expect(sanitized).toContain("[redacted]");
  });

  it("returns generic copy for XpActivityLoadError without leaking ids", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const message = xpActivityPublicErrorMessage(
      new XpActivityLoadError('Failed to query XP Events for enrollment recABCDEFGHIJKLMN'),
      "preview",
    );

    expect(message).toBe(DASHBOARD_GENERIC_UNAVAILABLE);
    expect(message).not.toMatch(/\brec[a-zA-Z0-9]{14,}\b/);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("returns generic copy for unknown errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const message = xpActivityPublicErrorMessage(new Error("Airtable 403 INVALID_PERMISSIONS"));

    expect(message).toBe(DASHBOARD_GENERIC_UNAVAILABLE);
    expect(message).not.toContain("INVALID_PERMISSIONS");

    spy.mockRestore();
  });
});
