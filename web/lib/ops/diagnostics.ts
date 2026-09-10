/**
 * SC-172 — production health + admin diagnostics helpers.
 *
 * Health is intentionally public and minimal.
 * Diagnostics are fail-closed, server-only, and never expose secrets or athlete data.
 */

import {
  getAthleteAuthSecret,
  hasUpstashRedisConfig,
  isAthleteAuthEnabled,
  isAthleteAuthTestMode,
  isMagicLinkTokenStoreAvailable,
} from "@/lib/auth/config";
import {
  hasAthleteSession,
  isSiteAccessAuthorized,
  isSiteAccessGateEnabled,
  readSiteAccessToken,
} from "@/lib/security";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export const ADMIN_DIAGNOSTICS_COOKIE = "admin_diagnostics_token";
export const ADMIN_DIAGNOSTICS_QUERY = "admin_diagnostics_token";

export type SecretPresence = "set" | "missing";

export type AdminDiagnosticsAuthResult =
  | { ok: true; via: "admin_diagnostics_token" | "site_access_token" }
  | { ok: false; status: 401 | 403; reason: string };

function readBoolishEnv(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function secretPresence(value: string | null | undefined): SecretPresence {
  return value?.trim() ? "set" : "missing";
}

function getAdminDiagnosticsToken(): string | null {
  return process.env.ADMIN_DIAGNOSTICS_TOKEN?.trim() || null;
}

/** Read ADMIN_DIAGNOSTICS_TOKEN from Bearer, cookie, or query. */
export function readAdminDiagnosticsToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const [, bearer] = header.match(/^Bearer\s+(.+)$/i) ?? [];
  if (bearer?.trim()) return bearer.trim();

  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_DIAGNOSTICS_COOKIE) {
      const value = rest.join("=").trim();
      if (value) return decodeURIComponent(value);
    }
  }

  try {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get(ADMIN_DIAGNOSTICS_QUERY)?.trim();
    if (queryToken) return queryToken;
  } catch {
    // ignore invalid URLs in tests
  }

  return null;
}

/**
 * Staff-only gate for diagnostics.
 * Athlete/parent sessions never grant access.
 * Fail closed when no admin token is configured.
 */
export function authorizeAdminDiagnostics(
  request: Request,
): AdminDiagnosticsAuthResult {
  if (hasAthleteSession(request) && !getAdminDiagnosticsToken() && !isSiteAccessGateEnabled()) {
    return {
      ok: false,
      status: 403,
      reason: "Athlete sessions do not grant admin diagnostics access.",
    };
  }

  const adminToken = getAdminDiagnosticsToken();
  if (adminToken) {
    const provided = readAdminDiagnosticsToken(request);
    if (provided === adminToken) {
      return { ok: true, via: "admin_diagnostics_token" };
    }
    // Dedicated admin token configured — do not fall back to site access or athlete session.
    if (hasAthleteSession(request)) {
      return {
        ok: false,
        status: 403,
        reason: "Athlete sessions do not grant admin diagnostics access.",
      };
    }
    return {
      ok: false,
      status: provided ? 403 : 401,
      reason: provided
        ? "Invalid admin diagnostics token."
        : "Admin diagnostics authorization required.",
    };
  }

  if (isSiteAccessGateEnabled()) {
    if (hasAthleteSession(request) && !isSiteAccessAuthorized(request)) {
      return {
        ok: false,
        status: 403,
        reason: "Athlete sessions do not grant admin diagnostics access.",
      };
    }
    if (isSiteAccessAuthorized(request) && readSiteAccessToken(request)) {
      return { ok: true, via: "site_access_token" };
    }
    return {
      ok: false,
      status: 401,
      reason: "Admin diagnostics authorization required.",
    };
  }

  return {
    ok: false,
    status: 403,
    reason:
      "Admin diagnostics gate is not configured. Set ADMIN_DIAGNOSTICS_TOKEN (preferred) or SITE_ACCESS_TOKEN.",
  };
}

/** Redact any accidental secret-shaped substrings from diagnostic strings. */
export function redactDiagnosticText(value: string): string {
  return value
    .replace(/\bpat[a-zA-Z0-9._-]{10,}\b/gi, "[redacted]")
    .replace(/\brec[a-zA-Z0-9]{14,}\b/g, "[redacted]")
    .replace(/\bapp[a-zA-Z0-9]{14,}\b/g, "[redacted]")
    .replace(/\bBearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(
      /(AIRTABLE_API_TOKEN|ATHLETE_AUTH_SECRET|ADMIN_DIAGNOSTICS_TOKEN|SITE_ACCESS_TOKEN|RESEND_API_KEY|CURRICULUM_HANDOFF_SECRET|CURRICULUM_INGRESS_SECRET|UPSTASH_REDIS_REST_TOKEN)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    );
}

/**
 * Server-only configuration snapshot for operators.
 * Presence flags only — never returns secret values, full base IDs, private URLs, or athlete data.
 */
export function buildAdminDiagnosticsPayload() {
  const airtableToken = process.env.AIRTABLE_API_TOKEN?.trim() ?? "";
  const airtableBaseId = process.env.AIRTABLE_BASE_ID?.trim() ?? "";
  const athleteSecret = getAthleteAuthSecret();

  return {
    ok: true as const,
    generatedAt: new Date().toISOString(),
    cacheControl: "no-store",
    athleteDataExposed: false as const,
    secretsExposed: false as const,
    auth: {
      adminGateConfigured: Boolean(getAdminDiagnosticsToken() || isSiteAccessGateEnabled()),
      adminDiagnosticsToken: secretPresence(getAdminDiagnosticsToken()),
      siteAccessGateEnabled: isSiteAccessGateEnabled(),
    },
    config: {
      airtable: {
        configured: Boolean(airtableToken && airtableBaseId),
        hasToken: Boolean(airtableToken),
        hasBaseId: Boolean(airtableBaseId),
        // Intentionally omit baseIdPreview / full IDs from this surface.
      },
      athleteAuth: {
        enabled: isAthleteAuthEnabled(),
        secretConfigured: Boolean(athleteSecret),
        testMode: isAthleteAuthTestMode(),
        magicLinkStoreAvailable: isMagicLinkTokenStoreAvailable(),
        upstashConfigured: hasUpstashRedisConfig(),
      },
      curriculum: {
        hubUrlConfigured: Boolean(process.env.CURRICULUM_HUB_URL?.trim()),
        handoffSecret: secretPresence(process.env.CURRICULUM_HANDOFF_SECRET),
        ingressSecret: secretPresence(process.env.CURRICULUM_INGRESS_SECRET),
      },
      email: {
        resendApiKey: secretPresence(process.env.RESEND_API_KEY),
        resendFromEmailConfigured: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
      },
      public: {
        basePath: process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/shoot",
        allowSearchIndexing: readBoolishEnv("NEXT_PUBLIC_ALLOW_SEARCH_INDEXING"),
      },
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    },
    secrets: {
      AIRTABLE_API_TOKEN: secretPresence(airtableToken),
      AIRTABLE_BASE_ID: secretPresence(airtableBaseId),
      ATHLETE_AUTH_SECRET: secretPresence(athleteSecret),
      SITE_ACCESS_TOKEN: secretPresence(process.env.SITE_ACCESS_TOKEN),
      ADMIN_DIAGNOSTICS_TOKEN: secretPresence(getAdminDiagnosticsToken()),
      RESEND_API_KEY: secretPresence(process.env.RESEND_API_KEY),
      CURRICULUM_HANDOFF_SECRET: secretPresence(process.env.CURRICULUM_HANDOFF_SECRET),
      CURRICULUM_INGRESS_SECRET: secretPresence(process.env.CURRICULUM_INGRESS_SECRET),
      UPSTASH_REDIS_REST_URL: secretPresence(process.env.UPSTASH_REDIS_REST_URL),
      UPSTASH_REDIS_REST_TOKEN: secretPresence(process.env.UPSTASH_REDIS_REST_TOKEN),
    },
  };
}

export type AdminDiagnosticsPayload = ReturnType<typeof buildAdminDiagnosticsPayload>;

/** Assert a diagnostics JSON body never contains secret-shaped values. */
export function assertDiagnosticsPayloadSafe(payload: unknown): string[] {
  const serialized = JSON.stringify(payload);
  const violations: string[] = [];
  if (/\bpat[a-zA-Z0-9._-]{10,}\b/i.test(serialized)) {
    violations.push("Airtable PAT-shaped value leaked");
  }
  if (/\brec[a-zA-Z0-9]{14,}\b/.test(serialized)) {
    violations.push("Airtable record id leaked");
  }
  if (/Bearer\s+(?!\[redacted\])\S+/i.test(serialized)) {
    violations.push("Bearer token leaked");
  }
  // Full base IDs should not appear; presence flags use "set"/"missing" only.
  if (/\bapp[a-zA-Z0-9]{14,}\b/.test(serialized)) {
    violations.push("Airtable base id leaked");
  }
  return violations;
}
