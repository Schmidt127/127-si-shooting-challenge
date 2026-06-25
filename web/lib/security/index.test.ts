import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { isSiteAccessAuthorized, readSiteAccessToken } from "@/lib/security";

const ORIGINAL_TOKEN = process.env.SITE_ACCESS_TOKEN;

describe("site access security", () => {
  beforeEach(() => {
    process.env.SITE_ACCESS_TOKEN = "secret-token";
  });

  afterEach(() => {
    process.env.SITE_ACCESS_TOKEN = ORIGINAL_TOKEN;
  });

  it("allows all traffic when gate is disabled", () => {
    delete process.env.SITE_ACCESS_TOKEN;

    const request = new Request("https://example.com/");
    expect(isSiteAccessAuthorized(request)).toBe(true);
  });

  it("accepts bearer tokens", () => {
    const request = new Request("https://example.com/", {
      headers: { authorization: "Bearer secret-token" },
    });

    expect(isSiteAccessAuthorized(request)).toBe(true);
  });

  it("accepts preview query tokens", () => {
    const request = new Request("https://example.com/?site_access_token=secret-token");

    expect(readSiteAccessToken(request)).toBe("secret-token");
    expect(isSiteAccessAuthorized(request)).toBe(true);
  });

  it("rejects invalid tokens", () => {
    const request = new Request("https://example.com/?site_access_token=wrong");

    expect(isSiteAccessAuthorized(request)).toBe(false);
  });
});
