import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyMagicLinkTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/magic-link-service", () => ({
  verifyMagicLinkToken: verifyMagicLinkTokenMock,
}));

import { GET } from "@/app/api/auth/verify/route";
import { createSignedAthleteSessionToken } from "@/lib/auth/session";
import { ATHLETE_SESSION_COOKIE } from "@/lib/auth/session";

const TEST_SECRET = "unit-test-secret-at-least-32-characters";
const VERIFY_URL =
  "https://www.fairfieldbasketballclub.com/shoot/api/auth/verify?token=raw-token-value";

describe("GET /api/auth/verify", () => {
  beforeEach(() => {
    verifyMagicLinkTokenMock.mockReset();
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_BASE_PATH = "/shoot";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to /shoot/dashboard and sets the session cookie on success", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({
      ok: true,
      sessionToken: "signed-session-token",
      maxAgeSeconds: 3600,
      redirectPath: "/dashboard",
      enrollmentCount: 1,
    });

    const response = await GET(new Request(VERIFY_URL));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard",
    );
    expect(response.headers.get("location")).not.toContain("token=");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ATHLETE_SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("redirects multi-child sessions to /shoot/dashboard/select", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({
      ok: true,
      sessionToken: "signed-session-token",
      maxAgeSeconds: 3600,
      redirectPath: "/dashboard/select",
      enrollmentCount: 2,
    });

    const response = await GET(new Request(VERIFY_URL));
    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/select",
    );
    expect(response.headers.get("location")).not.toContain("enrollmentId=");
  });

  it("redirects invalid tokens to /shoot/dashboard/sign-in without the token", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({ ok: false, reason: "invalid" });

    const response = await GET(new Request(VERIFY_URL));

    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in?error=invalid",
    );
    expect(response.headers.get("location")).not.toContain("token=");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("redirects expired tokens to the sign-in page", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({ ok: false, reason: "expired" });

    const response = await GET(new Request(VERIFY_URL));

    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in?error=expired",
    );
  });

  it("redirects reused tokens to the sign-in page", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({ ok: false, reason: "used" });

    const response = await GET(new Request(VERIFY_URL));

    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in?error=used",
    );
  });

  it("redirects misconfigured auth to the sign-in page", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({ ok: false, reason: "misconfigured" });

    const response = await GET(new Request(VERIFY_URL));

    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in?error=misconfigured",
    );
  });
});

describe("verify route with ATHLETE_AUTH_DEV_BYPASS disabled", () => {
  beforeEach(() => {
    verifyMagicLinkTokenMock.mockReset();
    process.env.NODE_ENV = "production";
    process.env.ATHLETE_AUTH_DEV_BYPASS = "false";
    process.env.NEXT_PUBLIC_BASE_PATH = "/shoot";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets Secure cookies in production", async () => {
    verifyMagicLinkTokenMock.mockResolvedValue({
      ok: true,
      sessionToken: createSignedAthleteSessionToken(
        {
          parentEmail: "parent@fairfield.k12.mt.us",
          enrollmentIds: ["recABCDEFGHIJKLM"],
        },
        TEST_SECRET,
      ),
      maxAgeSeconds: 3600,
      redirectPath: "/dashboard",
      enrollmentCount: 1,
    });

    const response = await GET(new Request(VERIFY_URL));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("Secure");
  });
});
