import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findActiveEnrollmentsByParentEmailMock = vi.hoisted(() => vi.fn());
const getAthleteSessionFromCookiesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/enrollment-access", () => ({
  findActiveEnrollmentsByParentEmail: findActiveEnrollmentsByParentEmailMock,
}));

vi.mock("@/lib/auth/server-session", () => ({
  getAthleteSessionFromCookies: getAthleteSessionFromCookiesMock,
}));

import { POST } from "@/app/api/auth/select-child/route";
import {
  ATHLETE_SESSION_COOKIE,
  verifySignedAthleteSessionToken,
} from "@/lib/auth/session";
import { createOpaqueSelectionToken } from "@/lib/auth/selection-token";

const TEST_SECRET = "unit-test-secret-at-least-32-characters";
const SELECT_URL = "https://www.fairfieldbasketballclub.com/shoot/api/auth/select-child";
const ORIGINAL_ENV = { ...process.env };

const ENROLLMENTS = [
  {
    enrollmentId: "recABCDEFGHIJKLM",
    displayName: "Child A",
    slug: "child-a",
    school: "Fairfield",
    grade: "7",
    level: "Shooter",
    xpTotal: 10,
    xpIntoLevel: 1,
    xpForNextLevel: 50,
    nextLevelLabel: "Hot Hand",
    programLabel: "Shooting Challenge",
    seasonLabel: "2026-2027",
  },
  {
    enrollmentId: "recNOPQRSTUVWXYZ",
    displayName: "Child B",
    slug: "child-b",
    school: "Fairfield",
    grade: "5",
    level: "Participant",
    xpTotal: 5,
    xpIntoLevel: 1,
    xpForNextLevel: 50,
    nextLevelLabel: "Shooter",
    programLabel: "Shooting Challenge",
    seasonLabel: "2026-2027",
  },
];

describe("POST /api/auth/select-child", () => {
  beforeEach(() => {
    process.env.ATHLETE_AUTH_ENABLED = "true";
    process.env.ATHLETE_AUTH_SECRET = TEST_SECRET;
    process.env.NEXT_PUBLIC_BASE_PATH = "/shoot";
    process.env.NODE_ENV = "test";
    findActiveEnrollmentsByParentEmailMock.mockReset();
    getAthleteSessionFromCookiesMock.mockReset();
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue(ENROLLMENTS);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("binds selectedEnrollmentId and redirects to /dashboard without enrollment ids", async () => {
    getAthleteSessionFromCookiesMock.mockResolvedValue({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: ["recABCDEFGHIJKLM", "recNOPQRSTUVWXYZ"],
      selectedEnrollmentId: null,
      exp: 9_999_999_999,
    });

    const selectionToken = createOpaqueSelectionToken(
      {
        enrollmentId: "recNOPQRSTUVWXYZ",
        parentEmail: "parent@fairfield.k12.mt.us",
      },
      TEST_SECRET,
    );

    const response = await POST(
      new Request(SELECT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectionToken }),
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard",
    );
    expect(response.headers.get("location")).not.toContain("enrollmentId=");
    expect(response.headers.get("location")).not.toMatch(/rec[A-Za-z0-9]{14}/);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ATHLETE_SESSION_COOKIE}=`);
    const match = setCookie.match(new RegExp(`${ATHLETE_SESSION_COOKIE}=([^;]+)`));
    expect(match).toBeTruthy();
    const session = verifySignedAthleteSessionToken(
      decodeURIComponent(match![1]!),
      TEST_SECRET,
    );
    expect(session?.selectedEnrollmentId).toBe("recNOPQRSTUVWXYZ");
  });

  it("rejects forged opaque tokens", async () => {
    getAthleteSessionFromCookiesMock.mockResolvedValue({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: ["recABCDEFGHIJKLM", "recNOPQRSTUVWXYZ"],
      selectedEnrollmentId: null,
      exp: 9_999_999_999,
    });

    const response = await POST(
      new Request(SELECT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectionToken: "forged.token.value" }),
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.fairfieldbasketballclub.com/shoot/dashboard/select",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects foreign enrollment claims outside the session grant", async () => {
    getAthleteSessionFromCookiesMock.mockResolvedValue({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: ["recABCDEFGHIJKLM"],
      selectedEnrollmentId: "recABCDEFGHIJKLM",
      exp: 9_999_999_999,
    });

    const selectionToken = createOpaqueSelectionToken(
      {
        enrollmentId: "recFOREIGN0000001",
        parentEmail: "parent@fairfield.k12.mt.us",
      },
      TEST_SECRET,
    );

    const response = await POST(
      new Request(SELECT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectionToken }),
      }),
    );

    expect(response.headers.get("location")).toContain("/dashboard/select");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
