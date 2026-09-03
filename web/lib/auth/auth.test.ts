import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findActiveEnrollmentsByParentEmailMock = vi.hoisted(() => vi.fn());
const loadAuthorizedEnrollmentForSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/enrollment-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/enrollment-access")>(
    "@/lib/auth/enrollment-access",
  );
  return {
    ...actual,
    findActiveEnrollmentsByParentEmail: findActiveEnrollmentsByParentEmailMock,
    loadAuthorizedEnrollmentForSession: loadAuthorizedEnrollmentForSessionMock,
  };
});

import {
  MAGIC_LINK_CONFIRMATION_MESSAGE,
  getAthleteAuthTestRecipient,
  isAthleteAuthTestMode,
} from "@/lib/auth/config";
import { validateParentEmailInput } from "@/lib/auth/parent-email";
import { checkMagicLinkRateLimit, resetMagicLinkRateLimitsForTests } from "@/lib/auth/rate-limit";
import { requestMagicLinkAccess, verifyMagicLinkToken } from "@/lib/auth/magic-link-service";
import {
  createSignedAthleteSessionToken,
  sessionOwnsEnrollment,
  verifySignedAthleteSessionToken,
} from "@/lib/auth/session";
import {
  createOpaqueSelectionToken,
  verifyOpaqueSelectionToken,
} from "@/lib/auth/selection-token";
import {
  buildMagicLinkTokenRecord,
  getMagicLinkTokenStore,
  resetMagicLinkTokenStoreForTests,
} from "@/lib/auth/token-store";
import { generateMagicLinkToken, hashMagicLinkToken, safeCompareTokenHash } from "@/lib/auth/tokens";
import { resolveSessionEnrollment } from "@/lib/auth/enrollment-access";
import { isMagicLinkTokenStoreAvailable } from "@/lib/auth/config";

const ORIGINAL_ENV = { ...process.env };
const TEST_SECRET = "unit-test-secret-at-least-32-characters";

const SAMPLE_ENROLLMENT = {
  enrollmentId: "recABCDEFGHIJKLM",
  displayName: "Testing Athlete",
  slug: "testing-athlete",
  school: "Fairfield",
  grade: "8",
  level: "Shooter",
  xpTotal: 100,
  xpIntoLevel: 10,
  xpForNextLevel: 50,
  nextLevelLabel: "Hot Hand",
  programLabel: "Shooting Challenge",
  seasonLabel: "2026-2027",
};

describe("magic link tokens", () => {
  it("generates unique raw tokens and stable hashes", () => {
    const first = generateMagicLinkToken();
    const second = generateMagicLinkToken();
    expect(first.raw).not.toBe(second.raw);
    expect(first.hash).toBe(hashMagicLinkToken(first.raw));
    expect(safeCompareTokenHash(first.hash, first.hash)).toBe(true);
    expect(safeCompareTokenHash(first.hash, second.hash)).toBe(false);
  });
});

describe("parent email validation", () => {
  it("blocks personal Gmail addresses", () => {
    expect(validateParentEmailInput("Parent@Gmail.com").ok).toBe(false);
  });

  it("accepts school/district addresses", () => {
    const result = validateParentEmailInput(" Parent@Fairfield.K12.mt.us ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("parent@fairfield.k12.mt.us");
    }
  });
});

describe("session cookies", () => {
  it("expires sessions based on exp", () => {
    const token = createSignedAthleteSessionToken(
      {
        parentEmail: "parent@fairfield.k12.mt.us",
        enrollmentIds: ["recABCDEFGHIJKLM"],
        exp: 100,
      },
      TEST_SECRET,
      200,
    );
    expect(verifySignedAthleteSessionToken(token, TEST_SECRET, 200)).toBeNull();
  });

  it("issues v2 sessions with optional selectedEnrollmentId", () => {
    const token = createSignedAthleteSessionToken(
      {
        parentEmail: "parent@fairfield.k12.mt.us",
        enrollmentIds: ["recABCDEFGHIJKLM", "recNOPQRSTUVWXYZ"],
        selectedEnrollmentId: "recNOPQRSTUVWXYZ",
      },
      TEST_SECRET,
    );
    const session = verifySignedAthleteSessionToken(token, TEST_SECRET);
    expect(session?.v).toBe(2);
    expect(session?.selectedEnrollmentId).toBe("recNOPQRSTUVWXYZ");
    expect(session?.enrollmentIds).toHaveLength(2);
  });

  it("migrates legacy v1 cookies to v2 without selection", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        v: 1,
        parentEmail: "parent@fairfield.k12.mt.us",
        enrollmentIds: ["recABCDEFGHIJKLM", "recNOPQRSTUVWXYZ"],
        exp: 9_999_999_999,
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", TEST_SECRET).update(encoded).digest("base64url");
    const session = verifySignedAthleteSessionToken(`${encoded}.${signature}`, TEST_SECRET);
    expect(session?.v).toBe(2);
    expect(session?.selectedEnrollmentId).toBeNull();
    expect(session?.enrollmentIds).toEqual(["recABCDEFGHIJKLM", "recNOPQRSTUVWXYZ"]);
  });

  it("denies cross-enrollment access", () => {
    const session = {
      v: 2 as const,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: ["recABCDEFGHIJKLM"],
      selectedEnrollmentId: "recABCDEFGHIJKLM",
      exp: 9_999_999_999,
    };
    expect(sessionOwnsEnrollment(session, "recABCDEFGHIJKLM")).toBe(true);
    expect(sessionOwnsEnrollment(session, "recHIJKLMNOPQRST")).toBe(false);
  });
});

describe("opaque selection tokens", () => {
  it("round-trips valid claims", () => {
    const token = createOpaqueSelectionToken(
      {
        enrollmentId: "recABCDEFGHIJKLM",
        parentEmail: "parent@fairfield.k12.mt.us",
      },
      TEST_SECRET,
    );
    const claims = verifyOpaqueSelectionToken(token, TEST_SECRET);
    expect(claims?.enrollmentId).toBe("recABCDEFGHIJKLM");
    expect(claims?.parentEmail).toBe("parent@fairfield.k12.mt.us");
  });

  it("rejects forged and expired tokens", () => {
    const token = createOpaqueSelectionToken(
      {
        enrollmentId: "recABCDEFGHIJKLM",
        parentEmail: "parent@fairfield.k12.mt.us",
        ttlSeconds: 10,
      },
      TEST_SECRET,
      1_000,
    );
    expect(verifyOpaqueSelectionToken(token, "wrong-secret-at-least-32-characters!", 1_005)).toBeNull();
    expect(verifyOpaqueSelectionToken(token, TEST_SECRET, 1_020)).toBeNull();
    expect(verifyOpaqueSelectionToken("not.a.token", TEST_SECRET)).toBeNull();
  });

  it("does not embed raw enrollment ids in the opaque token string", () => {
    const token = createOpaqueSelectionToken(
      {
        enrollmentId: "recABCDEFGHIJKLM",
        parentEmail: "parent@fairfield.k12.mt.us",
      },
      TEST_SECRET,
    );
    expect(token).not.toMatch(/rec[a-zA-Z0-9]{14}/);
    expect(Buffer.from(token, "utf8").toString("utf8")).not.toContain("recABCDEFGHIJKLM");
  });
});

describe("token store availability", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("allows in-memory storage outside production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isMagicLinkTokenStoreAvailable()).toBe(true);
  });

  it("requires Upstash Redis in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isMagicLinkTokenStoreAvailable()).toBe(false);
  });

  it("accepts Upstash Redis in production", () => {
    process.env.NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token-value";
    expect(isMagicLinkTokenStoreAvailable()).toBe(true);
  });
});

describe("magic link request responses", () => {
  beforeEach(() => {
    resetMagicLinkTokenStoreForTests();
    resetMagicLinkRateLimitsForTests();
    process.env.ATHLETE_AUTH_ENABLED = "true";
    process.env.ATHLETE_AUTH_SECRET = TEST_SECRET;
    process.env.ATHLETE_AUTH_TEST_MODE = "true";
    process.env.ATHLETE_AUTH_DEV_BYPASS = "true";
    findActiveEnrollmentsByParentEmailMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns misconfigured when production lacks Upstash", async () => {
    process.env.NODE_ENV = "production";
    process.env.ATHLETE_AUTH_DEV_BYPASS = "false";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([SAMPLE_ENROLLMENT]);

    const response = await requestMagicLinkAccess(
      "parent@fairfield.k12.mt.us",
      new Request("http://local"),
    );
    expect(response.status).toBe(503);
  });

  it("returns the same confirmation for unknown emails", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([]);

    const response = await requestMagicLinkAccess(
      "unknown@fairfield.k12.mt.us",
      new Request("http://local"),
    );
    const payload = (await response.json()) as { message: string };
    expect(payload.message).toBe(MAGIC_LINK_CONFIRMATION_MESSAGE);
  });

  it("returns the same confirmation for known emails", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([SAMPLE_ENROLLMENT]);

    const response = await requestMagicLinkAccess(
      "parent@fairfield.k12.mt.us",
      new Request("http://local"),
    );
    const payload = (await response.json()) as { message: string };
    expect(payload.message).toBe(MAGIC_LINK_CONFIRMATION_MESSAGE);
  });
});

describe("token store single-use behavior", () => {
  beforeEach(() => {
    resetMagicLinkTokenStoreForTests();
  });

  it("expires and rejects reuse", async () => {
    const store = getMagicLinkTokenStore();
    const { hash } = generateMagicLinkToken();
    const now = Date.now();
    await store.save(
      hash,
      buildMagicLinkTokenRecord("parent@fairfield.k12.mt.us", now - 20 * 60 * 1000),
    );

    const expired = await store.consume(hash, now);
    expect(expired.status).toBe("expired");

    await store.save(hash, buildMagicLinkTokenRecord("parent@fairfield.k12.mt.us", now));
    const first = await store.consume(hash, now + 1000);
    expect(first.status).toBe("ok");
    const second = await store.consume(hash, now + 2000);
    expect(second.status).toBe("used");
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    resetMagicLinkRateLimitsForTests();
    process.env.ATHLETE_AUTH_RATE_LIMIT_EMAIL_PER_HOUR = "2";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throttles repeated email requests", () => {
    const now = 1_700_000_000_000;
    expect(checkMagicLinkRateLimit({ email: "a@test.com", ip: "1.1.1.1", now }).allowed).toBe(true);
    expect(checkMagicLinkRateLimit({ email: "a@test.com", ip: "1.1.1.1", now }).allowed).toBe(true);
    expect(checkMagicLinkRateLimit({ email: "a@test.com", ip: "1.1.1.1", now }).allowed).toBe(false);
  });
});

describe("test mode recipient enforcement", () => {
  beforeEach(() => {
    process.env.ATHLETE_AUTH_TEST_MODE = "true";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("forces the configured test recipient", () => {
    expect(isAthleteAuthTestMode()).toBe(true);
    expect(getAthleteAuthTestRecipient()).toBe("schmidt@fairfieldbasketballclub.com");
  });
});

describe("verifyMagicLinkToken", () => {
  beforeEach(() => {
    resetMagicLinkTokenStoreForTests();
    process.env.ATHLETE_AUTH_ENABLED = "true";
    process.env.ATHLETE_AUTH_SECRET = TEST_SECRET;
    findActiveEnrollmentsByParentEmailMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects invalid tokens", async () => {
    const result = await verifyMagicLinkToken("not-a-real-token");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("auto-selects and redirects to dashboard for one child", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([SAMPLE_ENROLLMENT]);

    const { raw, hash } = generateMagicLinkToken();
    await getMagicLinkTokenStore().save(
      hash,
      buildMagicLinkTokenRecord("parent@fairfield.k12.mt.us"),
    );

    const result = await verifyMagicLinkToken(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectPath).toBe("/dashboard");
    const session = verifySignedAthleteSessionToken(result.sessionToken, TEST_SECRET);
    expect(session?.selectedEnrollmentId).toBe("recABCDEFGHIJKLM");
  });

  it("forces select page for multiple children", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      SAMPLE_ENROLLMENT,
      {
        ...SAMPLE_ENROLLMENT,
        enrollmentId: "recNOPQRSTUVWXYZ",
        displayName: "Sibling Athlete",
        slug: "sibling-athlete",
      },
    ]);

    const { raw, hash } = generateMagicLinkToken();
    await getMagicLinkTokenStore().save(
      hash,
      buildMagicLinkTokenRecord("parent@fairfield.k12.mt.us"),
    );

    const result = await verifyMagicLinkToken(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectPath).toBe("/dashboard/select");
    const session = verifySignedAthleteSessionToken(result.sessionToken, TEST_SECRET);
    expect(session?.selectedEnrollmentId).toBeNull();
    expect(session?.enrollmentIds).toHaveLength(2);
  });
});

describe("enrollment URL tampering", () => {
  it("never authorizes URL enrollment ids", () => {
    const result = resolveSessionEnrollment(
      {
        v: 2,
        parentEmail: "parent@fairfield.k12.mt.us",
        enrollmentIds: ["recABCDEFGHIJKLM"],
        selectedEnrollmentId: "recABCDEFGHIJKLM",
        exp: 9_999_999_999,
      },
      "recHIJKLMNOPQRST",
    );

    expect(result.rejectedUrlEnrollmentId).toBe(true);
    expect(result.enrollment).toBeNull();
  });
});
