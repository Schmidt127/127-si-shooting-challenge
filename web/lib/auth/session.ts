import { createHmac, timingSafeEqual } from "node:crypto";

import { getAthleteSessionTtlSeconds } from "@/lib/auth/config";

export const ATHLETE_SESSION_COOKIE = "athlete_session";

/**
 * SC-112 session v2 — parent identity + authorized enrollments + optional selected child.
 * `selectedEnrollmentId` is server-only state inside the signed cookie (never put in URLs).
 */
export type AthleteSessionPayload = {
  v: 2;
  parentEmail: string;
  enrollmentIds: string[];
  selectedEnrollmentId?: string | null;
  exp: number;
};

/** Legacy v1 cookie shape accepted during verify for one-release migration. */
type AthleteSessionPayloadV1 = {
  v: 1;
  parentEmail: string;
  enrollmentIds: string[];
  exp: number;
};

type SessionCreateInput = {
  parentEmail: string;
  enrollmentIds: string[];
  selectedEnrollmentId?: string | null;
  exp?: number;
};

function encodePayload(payload: AthleteSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function normalizeSessionPayload(
  parsed: AthleteSessionPayload | AthleteSessionPayloadV1,
): AthleteSessionPayload | null {
  if (!parsed.parentEmail || !Array.isArray(parsed.enrollmentIds)) return null;
  if (!Number.isFinite(parsed.exp)) return null;

  if (parsed.v === 1) {
    return {
      v: 2,
      parentEmail: parsed.parentEmail,
      enrollmentIds: [...parsed.enrollmentIds],
      selectedEnrollmentId: null,
      exp: parsed.exp,
    };
  }

  if (parsed.v !== 2) return null;

  return {
    v: 2,
    parentEmail: parsed.parentEmail,
    enrollmentIds: [...parsed.enrollmentIds],
    selectedEnrollmentId: parsed.selectedEnrollmentId ?? null,
    exp: parsed.exp,
  };
}

function decodePayload(encoded: string): AthleteSessionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as AthleteSessionPayload | AthleteSessionPayloadV1;
    return normalizeSessionPayload(parsed);
  } catch {
    return null;
  }
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSignedAthleteSessionToken(
  payload: SessionCreateInput,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const selected =
    payload.selectedEnrollmentId === undefined ? null : payload.selectedEnrollmentId;
  const full: AthleteSessionPayload = {
    v: 2,
    parentEmail: payload.parentEmail,
    enrollmentIds: [...payload.enrollmentIds],
    selectedEnrollmentId: selected,
    exp: payload.exp ?? nowSeconds + getAthleteSessionTtlSeconds(),
  };
  const encoded = encodePayload(full);
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySignedAthleteSessionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): AthleteSessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded, secret);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  const payload = decodePayload(encoded);
  if (!payload || payload.exp <= nowSeconds) return null;
  return payload;
}

export function readAthleteSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ATHLETE_SESSION_COOKIE) {
      const value = rest.join("=").trim();
      if (value) return decodeURIComponent(value);
    }
  }
  return null;
}

export function readAthleteSessionFromRequest(
  request: Request,
  secret: string,
): AthleteSessionPayload | null {
  const token = readAthleteSessionCookie(request);
  if (!token) return null;
  return verifySignedAthleteSessionToken(token, secret);
}

export function sessionOwnsEnrollment(
  session: AthleteSessionPayload,
  enrollmentId: string,
): boolean {
  return session.enrollmentIds.includes(enrollmentId);
}

export function buildSessionCookieHeader(
  token: string,
  maxAgeSeconds: number,
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ATHLETE_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function buildClearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ATHLETE_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
