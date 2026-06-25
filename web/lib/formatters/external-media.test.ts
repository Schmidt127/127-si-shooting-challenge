import { describe, expect, it } from "vitest";

import {
  isAdobeDocumentUrl,
  shouldOpenExternally,
} from "@/lib/formatters/external-media";

describe("isAdobeDocumentUrl", () => {
  it("detects acrobat share links", () => {
    expect(
      isAdobeDocumentUrl("https://acrobat.adobe.com/id/urn:aaid:sc:US:abc123"),
    ).toBe(true);
  });

  it("detects document cloud links", () => {
    expect(
      isAdobeDocumentUrl("https://documentcloud.adobe.com/view/standard/abc"),
    ).toBe(true);
  });

  it("ignores youtube links", () => {
    expect(isAdobeDocumentUrl("https://www.youtube.com/watch?v=abc")).toBe(false);
  });
});

describe("shouldOpenExternally", () => {
  it("requires adobe and pdf links to open in a new tab", () => {
    expect(shouldOpenExternally("https://example.com/rules.pdf")).toBe(true);
    expect(shouldOpenExternally("https://acrobat.adobe.com/link/track?uri=x")).toBe(true);
    expect(shouldOpenExternally("https://youtu.be/abc123")).toBe(false);
  });
});
