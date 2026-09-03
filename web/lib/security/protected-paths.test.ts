import { describe, expect, it } from "vitest";

import {
  hasAthleteSession,
  isAthleteProtectedPath,
  isStaffProtectedPath,
} from "@/lib/security";

describe("protected path scaffolding (SC-112 groundwork)", () => {
  it("recognizes future athlete-protected paths", () => {
    expect(isAthleteProtectedPath("/dashboard")).toBe(true);
    expect(isAthleteProtectedPath("/dashboard/sign-in")).toBe(false);
    expect(isAthleteProtectedPath("/athletes/schmidt")).toBe(false);
    expect(isAthleteProtectedPath("/leaderboard")).toBe(false);
  });

  it("recognizes future staff-protected paths", () => {
    expect(isStaffProtectedPath("/admin")).toBe(true);
    expect(isStaffProtectedPath("/admin/tools")).toBe(true);
    expect(isStaffProtectedPath("/dashboard")).toBe(false);
  });

  it("never claims an athlete session exists today", () => {
    expect(
      hasAthleteSession(new Request("https://example.com/dashboard")),
    ).toBe(false);
  });

  it("detects athlete session when auth is enabled and cookie is valid", async () => {
    process.env.ATHLETE_AUTH_ENABLED = "true";
    process.env.ATHLETE_AUTH_SECRET = "test-secret-at-least-32-characters-long";

    const { createSignedAthleteSessionToken, ATHLETE_SESSION_COOKIE } = await import(
      "@/lib/auth/session"
    );
    const token = createSignedAthleteSessionToken(
      {
        parentEmail: "schmidt@fairfieldbasketballclub.com",
        enrollmentIds: ["recTestEnrollment1"],
      },
      process.env.ATHLETE_AUTH_SECRET,
    );

    const request = new Request("https://example.com/dashboard", {
      headers: { cookie: `${ATHLETE_SESSION_COOKIE}=${encodeURIComponent(token)}` },
    });

    expect(hasAthleteSession(request)).toBe(true);
  });
});
