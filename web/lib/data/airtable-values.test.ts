import { describe, expect, it } from "vitest";

import { asText, asUrl } from "@/lib/data/airtable-values";

describe("asText", () => {
  it("reads aiText value objects", () => {
    expect(
      asText(
        {
          state: "generated",
          value: "Short summary",
          isStale: false,
        },
        "",
      ),
    ).toBe("Short summary");
  });

  it("reads single-select objects by name", () => {
    expect(asText({ id: "sel123", name: "HW 1", color: "blueLight2" }, "")).toBe("HW 1");
  });

  it("returns fallback for unknown objects", () => {
    expect(asText({ foo: "bar" }, "")).toBe("");
  });
});

describe("asUrl", () => {
  it("returns empty string when missing", () => {
    expect(asUrl(undefined)).toBe("");
  });
});
