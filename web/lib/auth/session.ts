import { createHmac, timingSafeEqual } from "node:crypto";

import { getAthleteSessionTtlSeconds } from "@/lib/auth/config";

export const ATHLETE_SESSION_COOKIE = "athlete_session";

export type AthleteSessionPayload = {
  v: 1;
  parentEmail: string;
  enrollmentIds: string[];
  exp: number;
};

function encodePayload(payload: AthleteSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): AthleteSessionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as AthleteSessionPayload;
    if (parsed.v !== 1) return null;
    if (!parsed.parentEmail || !Array.isArray(parsed.enrollmentIds)) return null;
    if (!Number.isFinite(parsed.exp)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSignedAthleteSessionToken(
  payload: Omit<AthleteSessionPayload, "v" | "exp"> & { exp?: number },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const full: AthleteSessionPayload = {
    v: 1,
    parentEmail: payload.parentEmail,
    enrollmentIds: [...payload.enrollmentIds],
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
