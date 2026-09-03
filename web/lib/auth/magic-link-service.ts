import { cookies, headers } from "next/headers";

import {
  getAthleteAuthSecret,
  getAthleteSessionTtlSeconds,
  isAthleteAuthConfigured,
} from "@/lib/auth/config";
import { findActiveEnrollmentsByParentEmail } from "@/lib/auth/enrollment-access";
import { sendMagicLinkEmail } from "@/lib/auth/magic-link-email";
import { validateParentEmailInput } from "@/lib/auth/parent-email";
import { checkMagicLinkRateLimit } from "@/lib/auth/rate-limit";
import {
  magicLinkMisconfiguredResponse,
  magicLinkInvalidEmailResponse,
  magicLinkRateLimitedResponse,
  magicLinkRequestSuccessResponse,
} from "@/lib/auth/responses";
import { createSignedAthleteSessionToken } from "@/lib/auth/session";
import {
  buildMagicLinkTokenRecord,
  getMagicLinkTokenStore,
} from "@/lib/auth/token-store";
import { generateMagicLinkToken, hashMagicLinkToken } from "@/lib/auth/tokens";

function resolveClientIp(headerStore: Headers): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerStore.get("x-real-ip")?.trim() || null;
}

function buildMagicLinkUrl(rawToken: string, origin: string, basePath: string): string {
  const prefix = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return `${origin}${prefix}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;
}

export async function requestMagicLinkAccess(
  rawEmail: string,
  request?: Request,
): Promise<Response> {
  if (!isAthleteAuthConfigured()) {
    return magicLinkMisconfiguredResponse();
  }

  const validation = validateParentEmailInput(rawEmail);
  if (!validation.ok) {
    return magicLinkInvalidEmailResponse();
  }

  const headerStore = request?.headers ?? (await headers());
  const ip = resolveClientIp(headerStore);
  const rate = checkMagicLinkRateLimit({ email: validation.email, ip });
  if (!rate.allowed) {
    return magicLinkRateLimitedResponse();
  }

  const enrollments = await findActiveEnrollmentsByParentEmail(validation.email);
  if (enrollments.length === 0) {
    return magicLinkRequestSuccessResponse();
  }

  const { raw, hash } = generateMagicLinkToken();
  const store = getMagicLinkTokenStore();
  await store.save(hash, buildMagicLinkTokenRecord(validation.email));

  const origin =
    headerStore.get("x-forwarded-proto") && headerStore.get("x-forwarded-host")
      ? `${headerStore.get("x-forwarded-proto")}://${headerStore.get("x-forwarded-host")}`
      : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3001";

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/shoot";
  const magicLinkUrl = buildMagicLinkUrl(raw, origin, basePath);

  const emailResult = await sendMagicLinkEmail({
    toEmail: validation.email,
    magicLinkUrl,
  });

  if (!emailResult.ok) {
    return magicLinkMisconfiguredResponse();
  }

  return magicLinkRequestSuccessResponse();
}

export async function verifyMagicLinkToken(rawToken: string): Promise<{
  ok: true;
  sessionToken: string;
  maxAgeSeconds: number;
} | {
  ok: false;
  reason: "misconfigured" | "invalid" | "expired" | "used";
}> {
  if (!isAthleteAuthConfigured()) {
    return { ok: false, reason: "misconfigured" };
  }

  const secret = getAthleteAuthSecret();
  if (!secret) return { ok: false, reason: "misconfigured" };

  const trimmed = rawToken.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };

  const hash = hashMagicLinkToken(trimmed);
  const store = getMagicLinkTokenStore();
  const consumed = await store.consume(hash);
  if (consumed.status === "expired") return { ok: false, reason: "expired" };
  if (consumed.status === "used") return { ok: false, reason: "used" };
  if (consumed.status !== "ok") return { ok: false, reason: "invalid" };

  const enrollments = await findActiveEnrollmentsByParentEmail(consumed.record.parentEmail);
  if (enrollments.length === 0) {
    return { ok: false, reason: "invalid" };
  }

  const sessionToken = createSignedAthleteSessionToken(
    {
      parentEmail: consumed.record.parentEmail,
      enrollmentIds: enrollments.map((item) => item.enrollmentId),
    },
    secret,
  );

  return {
    ok: true,
    sessionToken,
    maxAgeSeconds: getAthleteSessionTtlSeconds(),
  };
}

export async function clearAthleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("athlete_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
