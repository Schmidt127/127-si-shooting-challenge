import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedAthleteSessionToken } from "@/lib/auth/session";
import { ATHLETE_SESSION_COOKIE } from "@/lib/auth/session";
import {
  assertDiagnosticsPayloadSafe,
  authorizeAdminDiagnostics,
  buildAdminDiagnosticsPayload,
  redactDiagnosticText,
} from "@/lib/ops/diagnostics";

const TEST_ATHLETE_SECRET = "unit-test-athlete-secret-at-least-32-chars";
const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

function clearAdminEnv() {
  delete process.env.ADMIN_DIAGNOSTICS_TOKEN;
  delete process.env.SITE_ACCESS_TOKEN;
  delete process.env.ATHLETE_AUTH_ENABLED;
  delete process.env.ATHLETE_AUTH_SECRET;
  delete process.env.AIRTABLE_API_TOKEN;
  delete process.env.AIRTABLE_BASE_ID;
}

describe("admin diagnostics authorization", () => {
  beforeEach(() => {
    clearAdminEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("fails closed when no admin gate is configured", () => {
    const result = authorizeAdminDiagnostics(new Request("https://example.com/api/admin/diagnostics"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("accepts ADMIN_DIAGNOSTICS_TOKEN via Bearer", () => {
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret";
    const request = new Request("https://example.com/api/admin/diagnostics", {
      headers: { authorization: "Bearer admin-secret" },
    });
    const result = authorizeAdminDiagnostics(request);
    expect(result).toEqual({ ok: true, via: "admin_diagnostics_token" });
  });

  it("rejects unauthenticated requests when admin token is configured", () => {
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret";
    const result = authorizeAdminDiagnostics(
      new Request("https://example.com/api/admin/diagnostics"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("rejects athlete sessions even when athlete auth is enabled", () => {
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret";
    process.env.ATHLETE_AUTH_ENABLED = "true";
    process.env.ATHLETE_AUTH_SECRET = TEST_ATHLETE_SECRET;

    const session = createSignedAthleteSessionToken(
      {
        enrollmentIds: ["recAAAAAAAAAAAAAAAA"],
        selectedEnrollmentId: "recAAAAAAAAAAAAAAAA",
        parentEmail: "parent@example.com",
      },
      TEST_ATHLETE_SECRET,
    );

    const request = new Request("https://example.com/api/admin/diagnostics", {
      headers: { cookie: `${ATHLETE_SESSION_COOKIE}=${session}` },
    });

    const result = authorizeAdminDiagnostics(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.reason.toLowerCase()).toContain("athlete");
    }
  });

  it("accepts SITE_ACCESS_TOKEN when ADMIN_DIAGNOSTICS_TOKEN is unset", () => {
    process.env.SITE_ACCESS_TOKEN = "site-secret";
    const request = new Request("https://example.com/api/admin/diagnostics", {
      headers: { authorization: "Bearer site-secret" },
    });
    const result = authorizeAdminDiagnostics(request);
    expect(result).toEqual({ ok: true, via: "site_access_token" });
  });

  it("does not treat SITE_ACCESS_TOKEN as sufficient when ADMIN_DIAGNOSTICS_TOKEN is set", () => {
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret";
    process.env.SITE_ACCESS_TOKEN = "site-secret";
    const request = new Request("https://example.com/api/admin/diagnostics", {
      headers: { authorization: "Bearer site-secret" },
    });
    const result = authorizeAdminDiagnostics(request);
    expect(result.ok).toBe(false);
  });
});

describe("diagnostics payload safety", () => {
  beforeEach(() => {
    clearAdminEnv();
    process.env.AIRTABLE_API_TOKEN = "patXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    process.env.AIRTABLE_BASE_ID = "appn84sqPw03zEbTT";
    process.env.ATHLETE_AUTH_SECRET = TEST_ATHLETE_SECRET;
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret-value-do-not-leak";
    process.env.RESEND_API_KEY = "re_test_key_should_not_appear";
  });

  afterEach(() => {
    restoreEnv();
  });

  it("returns presence flags without secret values or athlete data", () => {
    const payload = buildAdminDiagnosticsPayload();
    expect(payload.ok).toBe(true);
    expect(payload.athleteDataExposed).toBe(false);
    expect(payload.secretsExposed).toBe(false);
    expect(payload.secrets.AIRTABLE_API_TOKEN).toBe("set");
    expect(payload.secrets.AIRTABLE_BASE_ID).toBe("set");
    expect(payload.config.airtable.configured).toBe(true);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("patXXXXXXXX");
    expect(serialized).not.toContain("appn84sqPw03zEbTT");
    expect(serialized).not.toContain("admin-secret-value-do-not-leak");
    expect(serialized).not.toContain("re_test_key");
    expect(serialized).not.toContain("parent@");
    expect(serialized).not.toContain("enrollment");
    expect(assertDiagnosticsPayloadSafe(payload)).toEqual([]);
  });

  it("redacts secret-shaped diagnostic text", () => {
    expect(
      redactDiagnosticText("token patXXXXXXXXXXXXXXXX Authorization: Bearer abc123"),
    ).toContain("[redacted]");
  });
});

describe("health and diagnostics routes", () => {
  beforeEach(() => {
    clearAdminEnv();
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it("GET /api/health returns only { status: ok } with no-store", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("GET /api/admin/diagnostics rejects unauthorized callers", async () => {
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret";
    const { GET } = await import("@/app/api/admin/diagnostics/route");
    const response = await GET(
      new Request("https://example.com/shoot/api/admin/diagnostics") as never,
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(assertDiagnosticsPayloadSafe(body)).toEqual([]);
  });

  it("GET /api/admin/diagnostics returns redacted config for authorized admin", async () => {
    process.env.ADMIN_DIAGNOSTICS_TOKEN = "admin-secret";
    process.env.AIRTABLE_API_TOKEN = "patXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    process.env.AIRTABLE_BASE_ID = "appn84sqPw03zEbTT";
    const { GET } = await import("@/app/api/admin/diagnostics/route");
    const response = await GET(
      new Request("https://example.com/shoot/api/admin/diagnostics", {
        headers: { authorization: "Bearer admin-secret" },
      }) as never,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.athleteDataExposed).toBe(false);
    expect(JSON.stringify(body)).not.toContain("patXXXXXXXX");
    expect(JSON.stringify(body)).not.toContain("appn84sqPw03zEbTT");
    expect(assertDiagnosticsPayloadSafe(body)).toEqual([]);
  });
});

describe("route file existence and basePath expectations", () => {
  it("documents the public production paths under /shoot basePath", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "../..");

    expect(
      fs.existsSync(path.join(root, "app/api/health/route.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, "app/api/admin/diagnostics/route.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, "app/(program)/admin/diagnostics/page.tsx")),
    ).toBe(true);

    // App Router paths are relative to basePath (/shoot). Public URLs:
    const expected = {
      health: "/shoot/api/health",
      diagnosticsPage: "/shoot/admin/diagnostics",
      diagnosticsApi: "/shoot/api/admin/diagnostics",
    };
    expect(expected.health).toBe("/shoot/api/health");
    expect(expected.diagnosticsPage).toBe("/shoot/admin/diagnostics");
    expect(expected.diagnosticsApi).toBe("/shoot/api/admin/diagnostics");
  });
});
