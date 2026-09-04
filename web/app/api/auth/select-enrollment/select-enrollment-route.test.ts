import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findActiveEnrollmentsByParentEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/enrollment-access", () => ({
  findActiveEnrollmentsByParentEmail: findActiveEnrollmentsByParentEmailMock,
}));

import { POST } from "@/app/api/auth/select-enrollment/route";
import { mintEnrollmentSelectionKey } from "@/lib/auth/selection-token";
import {
  ATHLETE_SESSION_COOKIE,
  createSignedAthleteSessionToken,
  verifySignedAthleteSessionToken,
} from "@/lib/auth/session";

const TEST_SECRET = "unit-test-secret-at-least-32-characters";
const PARENT = "parent@fairfield.k12.mt.us";
const ENROLL_A = "recABCDEFGHIJKLMN";
const ENROLL_B = "recOPQRSTUVWXYab1";

function sessionCookie(selected?: string | null) {
  const token = createSignedAthleteSessionToken(
    {
      parentEmail: PARENT,
      enrollmentIds: [ENROLL_A, ENROLL_B],
      selectedEnrollmentId: selected === undefined ? null : selected,
    },
    TEST_SECRET,
  );
  return `${ATHLETE_SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

describe("POST /api/auth/select-enrollment", () => {
  beforeEach(() => {
    findActiveEnrollmentsByParentEmailMock.mockReset();
    process.env.ATHLETE_AUTH_ENABLED = "true";
    process.env.ATHLETE_AUTH_SECRET = TEST_SECRET;
    process.env.NEXT_PUBLIC_BASE_PATH = "/shoot";
    process.env.NODE_ENV = "test";
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
        enrollmentId: ENROLL_A,
        displayName: "Alex",
        slug: "alex",
        school: "",
        grade: "",
        level: "",
        programLabel: "Shooting Challenge",
        seasonLabel: "2026-2027",
        xpTotal: 0,
        xpIntoLevel: 0,
        xpForNextLevel: 0,
        nextLevelLabel: "",
      },
      {
        enrollmentId: ENROLL_B,
        displayName: "Blake",
        slug: "blake",
        school: "",
        grade: "",
        level: "",
        programLabel: "Shooting Challenge",
        seasonLabel: "2026-2027",
        xpTotal: 0,
        xpIntoLevel: 0,
        xpForNextLevel: 0,
        nextLevelLabel: "",
      },
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("binds an opaque selection key into the session and redirects to dashboard", async () => {
    const selectionKey = mintEnrollmentSelectionKey(ENROLL_B, PARENT, TEST_SECRET);
    const response = await POST(
      new Request("http://local/api/auth/select-enrollment", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: sessionCookie(null),
        },
        body: JSON.stringify({ selectionKey }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; redirectTo: string };
    expect(payload.ok).toBe(true);
    // App-relative for next/router — must NOT include /shoot (would 404 as /shoot/shoot/dashboard).
    expect(payload.redirectTo).toBe("/dashboard");
    expect(payload.redirectTo).not.toMatch(/^\/shoot(\/|$)/);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(ATHLETE_SESSION_COOKIE);
    const match = setCookie.match(new RegExp(`${ATHLETE_SESSION_COOKIE}=([^;]+)`));
    expect(match?.[1]).toBeTruthy();
    const token = decodeURIComponent(match![1]!);
    const session = verifySignedAthleteSessionToken(token, TEST_SECRET);
    expect(session?.selectedEnrollmentId).toBe(ENROLL_B);
    expect(session?.v).toBe(2);
  });

  it("rejects forged selection keys", async () => {
    const response = await POST(
      new Request("http://local/api/auth/select-enrollment", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: sessionCookie(null),
        },
        body: JSON.stringify({ selectionKey: "forged-opaque-key" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects raw Airtable enrollment ids as selection keys", async () => {
    const response = await POST(
      new Request("http://local/api/auth/select-enrollment", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: sessionCookie(null),
        },
        body: JSON.stringify({ selectionKey: ENROLL_A }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects unauthorized callers without a session", async () => {
    const selectionKey = mintEnrollmentSelectionKey(ENROLL_A, PARENT, TEST_SECRET);
    const response = await POST(
      new Request("http://local/api/auth/select-enrollment", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ selectionKey }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("HTML form POST 303 redirects to absolute /shoot/dashboard (not /shoot/shoot)", async () => {
    const selectionKey = mintEnrollmentSelectionKey(ENROLL_A, PARENT, TEST_SECRET);
    const response = await POST(
      new Request("https://www.fairfieldbasketballclub.com/shoot/api/auth/select-enrollment", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "text/html",
          cookie: sessionCookie(null),
          "x-forwarded-proto": "https",
          "x-forwarded-host": "www.fairfieldbasketballclub.com",
        },
        body: new URLSearchParams({ selectionKey }).toString(),
      }),
    );

    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard",
    );
    expect(location).not.toContain("/shoot/shoot/");
  });
});
