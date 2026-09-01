import { describe, expect, it } from "vitest";

import { AirtableApiError } from "@/lib/airtable/errors";
import {
  classifyHomeworkLoadError,
  HomeworkLoadError,
  publicHomeworkErrorMessage,
} from "@/lib/airtable/homework-load-errors";

describe("classifyHomeworkLoadError", () => {
  it("maps Airtable permission failures", () => {
    const error = classifyHomeworkLoadError(new AirtableApiError(403, "forbidden"), "corr-1");
    expect(error.category).toBe("airtable_permission");
    expect(error.retryable).toBe(false);
  });

  it("maps rate limits as retryable", () => {
    const error = classifyHomeworkLoadError(new AirtableApiError(429, "rate limit"), "corr-2");
    expect(error.category).toBe("airtable_rate_limit");
    expect(error.retryable).toBe(true);
  });

  it("maps missing configuration", () => {
    const error = classifyHomeworkLoadError(
      new Error("Missing Airtable configuration. Set AIRTABLE_API_TOKEN in environment variables."),
      "corr-3",
    );
    expect(error.category).toBe("configuration");
  });

  it("preserves HomeworkLoadError instances", () => {
    const original = new HomeworkLoadError({
      category: "missing_library",
      correlationId: "corr-4",
      message: "missing",
    });
    expect(classifyHomeworkLoadError(original, "corr-4")).toBe(original);
  });
});

describe("publicHomeworkErrorMessage", () => {
  it("does not expose correlation ids", () => {
    const message = publicHomeworkErrorMessage(
      new HomeworkLoadError({
        category: "unexpected",
        correlationId: "secret-correlation-id",
        message: "internal",
      }),
    );
    expect(message).not.toContain("secret-correlation-id");
  });
});
