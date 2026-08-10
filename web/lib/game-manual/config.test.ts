import { afterEach, describe, expect, it, vi } from "vitest";

import { getGameManualUrl } from "./config";

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
  it("fails closed when the public manual URL is missing, blank, or not HTTP(S)", () => {
    for (const value of [undefined, "", "   ", "javascript:alert(1)", "ftp://example.com/manual"]) {
      vi.stubEnv("NEXT_PUBLIC_GAME_MANUAL_URL", value ?? "");
      expect(getGameManualUrl()).toBeNull();
    }
  });

  it("returns a trimmed HTTP(S) public URL", () => {
    vi.stubEnv("NEXT_PUBLIC_GAME_MANUAL_URL", " https://acrobat.adobe.com/id/example ");
    expect(getGameManualUrl()).toBe("https://acrobat.adobe.com/id/example");
  });
});
