import { describe, expect, it } from "vitest";

import { AirtableApiError, isMissingAirtableViewError } from "@/lib/airtable/errors";

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
