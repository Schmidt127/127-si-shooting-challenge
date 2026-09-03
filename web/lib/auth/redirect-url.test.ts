import { describe, expect, it } from "vitest";

import { buildAbsoluteAuthRedirectUrl } from "@/lib/auth/redirect-url";

describe("buildAbsoluteAuthRedirectUrl", () => {
  it("prefers x-forwarded host for public redirects", () => {
    const request = new Request("https://127-si-shooting-challenge.vercel.app/shoot/api/auth/verify?token=abc", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "www.fairfieldbasketballclub.com",
      },
    });

    expect(buildAbsoluteAuthRedirectUrl(request, "/dashboard")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard",
    );
  });

  it("includes /shoot basePath and origin from the incoming request", () => {
    const request = new Request(
      "https://www.fairfieldbasketballclub.com/shoot/api/auth/verify?token=abc",
    );

    expect(buildAbsoluteAuthRedirectUrl(request, "/dashboard")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard",
    );
  });

  it("preserves query params without exposing the magic-link token", () => {
    const request = new Request(
      "https://www.fairfieldbasketballclub.com/shoot/api/auth/verify?token=secret-token",
    );

    const url = buildAbsoluteAuthRedirectUrl(request, "/dashboard/sign-in", {
      error: "invalid",
    });

    expect(url).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in?error=invalid",
    );
    expect(url).not.toContain("token=");
    expect(url).not.toContain("secret-token");
  });
});
