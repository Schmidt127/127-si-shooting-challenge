import { afterEach, describe, expect, it, vi } from "vitest";

import { GAME_MANUAL_PUBLISH_URL, getGameManualUrl } from "./config";

const originalUrl = process.env.NEXT_PUBLIC_GAME_MANUAL_URL;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_GAME_MANUAL_URL;
  } else {
    process.env.NEXT_PUBLIC_GAME_MANUAL_URL = originalUrl;
  }
});

describe("getGameManualUrl", () => {
  it("falls back to the approved Publish Online URL when env is missing, blank, or invalid", () => {
    for (const value of [undefined, "", "   ", "javascript:alert(1)", "ftp://example.com/manual"]) {
      vi.stubEnv("NEXT_PUBLIC_GAME_MANUAL_URL", value ?? "");
      expect(getGameManualUrl()).toBe(GAME_MANUAL_PUBLISH_URL);
    }
  });

  it("returns a trimmed HTTP(S) env override when set", () => {
    vi.stubEnv("NEXT_PUBLIC_GAME_MANUAL_URL", " https://acrobat.adobe.com/id/example ");
    expect(getGameManualUrl()).toBe("https://acrobat.adobe.com/id/example");
  });
});
