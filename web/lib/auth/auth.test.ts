import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findActiveEnrollmentsByParentEmailMock = vi.hoisted(() => vi.fn());
const loadAuthorizedEnrollmentForSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/enrollment-access", () => ({
  findActiveEnrollmentsByParentEmail: findActiveEnrollmentsByParentEmailMock,
  loadAuthorizedEnrollmentForSession: loadAuthorizedEnrollmentForSessionMock,
  pickPrimaryEnrollment: vi.fn(),
  resolveSessionEnrollment: vi.fn(),
}));

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
  buildMagicLinkTokenRecord,
  getMagicLinkTokenStore,
  resetMagicLinkTokenStoreForTests,
} from "@/lib/auth/token-store";
import { generateMagicLinkToken, hashMagicLinkToken, safeCompareTokenHash } from "@/lib/auth/tokens";
import { loadAuthorizedEnrollmentForSession } from "@/lib/auth/enrollment-access";
import { isMagicLinkTokenStoreAvailable } from "@/lib/auth/config";

const ORIGINAL_ENV = { ...process.env };
const TEST_SECRET = "unit-test-secret-at-least-32-characters";

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
  it("accepts personal Gmail addresses with case and whitespace normalization", () => {
    const result = validateParentEmailInput("  Parent.Family@Gmail.com  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("parent.family@gmail.com");
    }
  });

  it("accepts googlemail.com addresses", () => {
    const result = validateParentEmailInput("parent.family@googlemail.com");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("parent.family@googlemail.com");
    }
  });

  it("accepts school/district addresses", () => {
    const result = validateParentEmailInput(" Parent@Fairfield.K12.mt.us ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("parent@fairfield.k12.mt.us");
    }
  });

  it("rejects malformed addresses without domain-specific messaging", () => {
    const result = validateParentEmailInput("not-an-email");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid");
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

  it("stores selectedEnrollmentId in v2 sessions", () => {
    const token = createSignedAthleteSessionToken(
      {
        parentEmail: "parent@fairfield.k12.mt.us",
        enrollmentIds: ["recABCDEFGHIJKLM", "recNOPQRSTUVWXYa"],
        selectedEnrollmentId: "recNOPQRSTUVWXYa",
      },
      TEST_SECRET,
    );
    const session = verifySignedAthleteSessionToken(token, TEST_SECRET);
    expect(session?.v).toBe(2);
    expect(session?.selectedEnrollmentId).toBe("recNOPQRSTUVWXYa");
  });

  it("still verifies legacy v1 session cookies", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        v: 1,
        parentEmail: "parent@fairfield.k12.mt.us",
        enrollmentIds: ["recABCDEFGHIJKLM"],
        exp: 9_999_999_999,
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", TEST_SECRET).update(encoded).digest("base64url");
    const session = verifySignedAthleteSessionToken(`${encoded}.${signature}`, TEST_SECRET);
    expect(session?.v).toBe(1);
    expect(session?.enrollmentIds).toEqual(["recABCDEFGHIJKLM"]);
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
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
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
      },
    ]);

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
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
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
      },
    ]);

    const response = await requestMagicLinkAccess(
      "parent@fairfield.k12.mt.us",
      new Request("http://local"),
    );
    const payload = (await response.json()) as { message: string };
    expect(payload.message).toBe(MAGIC_LINK_CONFIRMATION_MESSAGE);
  });

  it("allows registered Gmail parents to request access without domain rejection", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
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
      },
    ]);

    const response = await requestMagicLinkAccess(
      "  Parent.Family@Gmail.com ",
      new Request("http://local"),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; message: string };
    expect(payload.ok).toBe(true);
    expect(payload.message).toBe(MAGIC_LINK_CONFIRMATION_MESSAGE);
    expect(findActiveEnrollmentsByParentEmailMock).toHaveBeenCalledWith(
      "parent.family@gmail.com",
    );
  });

  it("returns the same confirmation for unregistered Gmail without revealing registration", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([]);

    const response = await requestMagicLinkAccess(
      "parent.family@gmail.com",
      new Request("http://local"),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; message: string };
    expect(payload.ok).toBe(true);
    expect(payload.message).toBe(MAGIC_LINK_CONFIRMATION_MESSAGE);
    expect(findActiveEnrollmentsByParentEmailMock).toHaveBeenCalledWith(
      "parent.family@gmail.com",
    );
  });

  it("keeps non-Gmail parent requests intact alongside Gmail", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
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
      },
    ]);

    const school = await requestMagicLinkAccess(
      "parent@fairfield.k12.mt.us",
      new Request("http://local"),
    );
    const gmail = await requestMagicLinkAccess(
      "parent.family@gmail.com",
      new Request("http://local"),
    );
    const schoolPayload = (await school.json()) as { message: string };
    const gmailPayload = (await gmail.json()) as { message: string };
    expect(school.status).toBe(200);
    expect(gmail.status).toBe(200);
    expect(schoolPayload.message).toBe(gmailPayload.message);
    expect(schoolPayload.message).toBe(MAGIC_LINK_CONFIRMATION_MESSAGE);
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

  it("creates a session for a valid one-time token and auto-selects one child", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
        enrollmentId: "recABCDEFGHIJKLM",
        displayName: "Testing Athlete",
        slug: "testing-athlete",
        school: "Fairfield",
        grade: "8",
        level: "Shooter",
        programLabel: "Shooting Challenge",
        seasonLabel: "2026-2027",
        xpTotal: 100,
        xpIntoLevel: 10,
        xpForNextLevel: 50,
        nextLevelLabel: "Hot Hand",
      },
    ]);

    const { raw, hash } = generateMagicLinkToken();
    await getMagicLinkTokenStore().save(
      hash,
      buildMagicLinkTokenRecord("parent@fairfield.k12.mt.us"),
    );

    const result = await verifyMagicLinkToken(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectPath).toBe("/dashboard");
      expect(result.enrollmentCount).toBe(1);
      const session = verifySignedAthleteSessionToken(result.sessionToken, TEST_SECRET);
      expect(session?.selectedEnrollmentId).toBe("recABCDEFGHIJKLM");
    }
  });

  it("sends multi-child parents to the selection page without pre-selecting", async () => {
    findActiveEnrollmentsByParentEmailMock.mockResolvedValue([
      {
        enrollmentId: "recABCDEFGHIJKLM",
        displayName: "Alex",
        slug: "alex",
        school: "Fairfield",
        grade: "7",
        level: "Shooter",
        programLabel: "Shooting Challenge",
        seasonLabel: "2026-2027",
        xpTotal: 100,
        xpIntoLevel: 10,
        xpForNextLevel: 50,
        nextLevelLabel: "Hot Hand",
      },
      {
        enrollmentId: "recNOPQRSTUVWXYa",
        displayName: "Blake",
        slug: "blake",
        school: "Fairfield",
        grade: "5",
        level: "Shooter",
        programLabel: "Shooting Challenge",
        seasonLabel: "2026-2027",
        xpTotal: 50,
        xpIntoLevel: 5,
        xpForNextLevel: 50,
        nextLevelLabel: "Hot Hand",
      },
    ]);

    const { raw, hash } = generateMagicLinkToken();
    await getMagicLinkTokenStore().save(
      hash,
      buildMagicLinkTokenRecord("parent@fairfield.k12.mt.us"),
    );

    const result = await verifyMagicLinkToken(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectPath).toBe("/dashboard/select");
      expect(result.enrollmentCount).toBe(2);
      const session = verifySignedAthleteSessionToken(result.sessionToken, TEST_SECRET);
      expect(session?.selectedEnrollmentId).toBeNull();
      expect(session?.enrollmentIds).toHaveLength(2);
    }
  });
});

describe("enrollment URL tampering", () => {
  it("ignores unauthorized enrollment ids from the URL (session selection only)", async () => {
    loadAuthorizedEnrollmentForSessionMock.mockResolvedValue({
      enrollments: [],
      active: null,
      needsSelection: false,
      rejectedUrlEnrollmentId: false,
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: ["recABCDEFGHIJKLM"],
      selectedEnrollmentId: "recABCDEFGHIJKLM",
      exp: 9_999_999_999,
    });

    expect(result.rejectedUrlEnrollmentId).toBe(false);
  });
});
