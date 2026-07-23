import { describe, expect, it } from "vitest";

import {
  hasAthleteSession,
  isAthleteProtectedPath,
  isStaffProtectedPath,
} from "@/lib/security";

describe("protected path scaffolding (SC-112 groundwork)", () => {
  it("recognizes future athlete-protected paths", () => {
    expect(isAthleteProtectedPath("/dashboard")).toBe(true);
    expect(isAthleteProtectedPath("/athletes/schmidt")).toBe(true);
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
});
