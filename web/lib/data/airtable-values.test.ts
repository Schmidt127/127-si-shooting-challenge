import { describe, expect, it } from "vitest";

import {
  AirtableFieldError,
  asBoolean,
  asText,
  asUrl,
  linkedRecordIds,
  requireExactlyOneLinkedRecordId,
  requireExactlyOneLookupNumber,
  requireExactlyOneLookupText,
  requireSelectName,
  selectName,
  selectNames,
} from "@/lib/data/airtable-values";

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

describe("asBoolean", () => {
  it("uses OR semantics for boolean lookup arrays", () => {
    expect(asBoolean([])).toBe(false);
    expect(asBoolean([true])).toBe(true);
    expect(asBoolean([false])).toBe(false);
    expect(asBoolean([false, true])).toBe(true);
    expect(asBoolean([true, false])).toBe(true);
  });
});

describe("strict linked / lookup / select contracts", () => {
  it("requireExactlyOneLinkedRecordId accepts live REST id arrays only", () => {
    expect(requireExactlyOneLinkedRecordId(["recLevel2XXXXXXXXX"], "Current Level")).toBe(
      "recLevel2XXXXXXXXX",
    );
    expect(linkedRecordIds([{ name: "Level 2" }])).toEqual([]);
    expect(() => requireExactlyOneLinkedRecordId([], "Current Level")).toThrow(AirtableFieldError);
    expect(() =>
      requireExactlyOneLinkedRecordId(["recA", "recB"], "Current Level"),
    ).toThrow(/found 2/);
  });

  it("requireExactlyOneLookupNumber unwraps [n] lookup arrays", () => {
    expect(requireExactlyOneLookupNumber([1], "Level Sort Order - For Softr")).toBe(1);
    expect(requireExactlyOneLookupNumber(1, "Level Sort Order - For Softr")).toBe(1);
    expect(() => requireExactlyOneLookupNumber([-1], "Level Sort Order - For Softr")).toThrow(
      AirtableFieldError,
    );
  });

  it("requireExactlyOneLookupText unwraps text lookups", () => {
    expect(requireExactlyOneLookupText(["ATH-1"], "Athlete ID Lookup")).toBe("ATH-1");
    expect(() => requireExactlyOneLookupText([], "Athlete ID Lookup")).toThrow(/found 0/);
  });

  it("selectName / selectNames handle select objects", () => {
    expect(selectName({ id: "sel", name: "Assigned", color: "green" })).toBe("Assigned");
    expect(selectNames([{ id: "a", name: "Tutorial" }, { id: "b", name: "Shout - Out" }])).toEqual([
      "Tutorial",
      "Shout - Out",
    ]);
    expect(requireSelectName("Assigned", "Level Status")).toBe("Assigned");
  });
});
