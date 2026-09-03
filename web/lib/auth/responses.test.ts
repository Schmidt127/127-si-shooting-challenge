import { describe, expect, it } from "vitest";

import { stripInternalDetails } from "@/lib/auth/responses";

describe("user-facing output sanitization", () => {
  it("removes Airtable record ids from messages", () => {
    expect(stripInternalDetails("Enrollment recABCDEFGHIJKLMN failed")).toBe("Enrollment failed");
  });
});
