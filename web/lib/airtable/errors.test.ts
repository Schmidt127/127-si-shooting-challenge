import { describe, expect, it } from "vitest";

import {
  AirtableApiError,
  isMissingAirtableViewError,
  publicErrorMessage,
} from "@/lib/airtable/errors";

describe("isMissingAirtableViewError", () => {
  it("returns true for VIEW_NAME_NOT_FOUND bodies", () => {
    const error = new AirtableApiError(
      422,
      JSON.stringify({ error: { type: "VIEW_NAME_NOT_FOUND" } }),
    );

    expect(isMissingAirtableViewError(error)).toBe(true);
  });

  it("returns false for auth failures", () => {
    const error = new AirtableApiError(401, "Unauthorized");

    expect(isMissingAirtableViewError(error)).toBe(false);
  });
});

describe("publicErrorMessage", () => {
  it("never leaks Airtable response bodies to visitors", () => {
    const error = new AirtableApiError(
      403,
      JSON.stringify({ error: { type: "INVALID_PERMISSIONS", baseId: "appn84sqPw03zEbTT" } }),
    );

    const message = publicErrorMessage(error);
    expect(message).not.toContain("appn84sqPw03zEbTT");
    expect(message).not.toContain("INVALID_PERMISSIONS");
    expect(message).toMatch(/temporarily unavailable/i);
  });

  it("keeps the operator hint for missing configuration", () => {
    const error = new Error(
      "Missing Airtable configuration. Set AIRTABLE_API_TOKEN in environment variables.",
    );

    expect(publicErrorMessage(error)).toContain("Missing Airtable configuration");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(publicErrorMessage("boom")).toMatch(/unexpected error/i);
  });
});
