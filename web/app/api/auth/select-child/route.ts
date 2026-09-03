import { NextResponse } from "next/server";

import {
  getAthleteAuthSecret,
  getAthleteSessionTtlSeconds,
  isAthleteAuthConfigured,
} from "@/lib/auth/config";
import { findActiveEnrollmentsByParentEmail } from "@/lib/auth/enrollment-access";
import { buildAbsoluteAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { verifyOpaqueSelectionToken } from "@/lib/auth/selection-token";
import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import {
  ATHLETE_SESSION_COOKIE,
  createSignedAthleteSessionToken,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToSelect(request: Request): NextResponse {
  return NextResponse.redirect(buildAbsoluteAuthRedirectUrl(request, "/dashboard/select"));
}

function redirectToSignIn(request: Request): NextResponse {
  return NextResponse.redirect(buildAbsoluteAuthRedirectUrl(request, "/dashboard/sign-in"));
}

async function readSelectionToken(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { selectionToken?: string } | null;
    return body?.selectionToken?.trim() ?? "";
  }

  const form = await request.formData().catch(() => null);
  const value = form?.get("selectionToken");
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Bind the selected child into the signed session cookie.
 * Accepts an opaque selection token only — never raw Airtable enrollment IDs.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAthleteAuthConfigured()) {
    return redirectToSignIn(request);
  }

  const session = await getAthleteSessionFromCookies();
  if (!session) {
    return redirectToSignIn(request);
  }

  const secret = getAthleteAuthSecret();
  if (!secret) {
    return redirectToSignIn(request);
  }

  const selectionToken = await readSelectionToken(request);
  if (!selectionToken) {
    return redirectToSelect(request);
  }

  const claims = verifyOpaqueSelectionToken(selectionToken, secret);
  if (!claims) {
    return redirectToSelect(request);
  }

  if (claims.parentEmail !== session.parentEmail) {
    return redirectToSelect(request);
  }

  if (!session.enrollmentIds.includes(claims.enrollmentId)) {
    return redirectToSelect(request);
  }

  const live = await findActiveEnrollmentsByParentEmail(session.parentEmail);
  const authorized = live.filter((item) => session.enrollmentIds.includes(item.enrollmentId));
  const match = authorized.find((item) => item.enrollmentId === claims.enrollmentId);
  if (!match) {
    return redirectToSelect(request);
  }

  const maxAgeSeconds = getAthleteSessionTtlSeconds();
  const sessionToken = createSignedAthleteSessionToken(
    {
      parentEmail: session.parentEmail,
      enrollmentIds: authorized.map((item) => item.enrollmentId),
      selectedEnrollmentId: match.enrollmentId,
    },
    secret,
  );

  const response = NextResponse.redirect(buildAbsoluteAuthRedirectUrl(request, "/dashboard"));
  response.cookies.set(ATHLETE_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return response;
}
