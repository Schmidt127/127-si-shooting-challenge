import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/magic-link-service", () => ({
  clearAthleteSessionCookie: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/auth/sign-out/route";

describe("POST /api/auth/sign-out", () => {
  it("returns app-relative redirectTo for next/router (no /shoot prefix)", async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/shoot";
    const response = await POST();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; redirectTo: string };
    expect(payload.ok).toBe(true);
    expect(payload.redirectTo).toBe("/dashboard/sign-in");
    expect(payload.redirectTo).not.toMatch(/^\/shoot(\/|$)/);
  });
});
