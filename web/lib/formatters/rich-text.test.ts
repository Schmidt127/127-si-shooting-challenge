import { describe, expect, it } from "vitest";

import {
  normalizeRichTextBlock,
  parseInlineMarkdown,
  plainTextFromRichText,
  splitRichTextBlocks,
} from "./rich-text";

describe("splitRichTextBlocks", () => {
  it("returns empty for blank input", () => {
    expect(splitRichTextBlocks("")).toEqual([]);
    expect(splitRichTextBlocks("   \n\n  ")).toEqual([]);
  });

  it("splits on blank lines and strips heading markers", () => {
    expect(
      splitRichTextBlocks("## Zoom Meeting Full Description\n\n**Join us** tonight"),
    ).toEqual(["Zoom Meeting Full Description", "**Join us** tonight"]);
  });
});

describe("normalizeRichTextBlock", () => {
  it("converts markdown list markers to bullets", () => {
    expect(normalizeRichTextBlock("- First\n* Second")).toBe("• First\n• Second");
  });
});

describe("parseInlineMarkdown", () => {
  it("parses bold, italic, and safe links", () => {
    expect(parseInlineMarkdown("**Join** the _call_ at [Zoom](https://zoom.us/j/1)")).toEqual([
      { type: "bold", value: "Join" },
      { type: "text", value: " the " },
      { type: "italic", value: "call" },
      { type: "text", value: " at " },
      { type: "link", value: "Zoom", href: "https://zoom.us/j/1" },
    ]);
  });

  it("leaves unmatched text alone and rejects non-http links", () => {
    expect(parseInlineMarkdown("plain text")).toEqual([{ type: "text", value: "plain text" }]);
    expect(parseInlineMarkdown("[x](javascript:alert(1))")).toEqual([
      { type: "text", value: "[x](javascript:alert(1))" },
    ]);
  });
});

describe("plainTextFromRichText", () => {
  it("strips markers for card previews", () => {
    expect(plainTextFromRichText("**Join** our Zoom")).toBe("Join our Zoom");
  });
});
