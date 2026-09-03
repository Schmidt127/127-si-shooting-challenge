import { NextResponse } from "next/server";

import { withBasePath } from "@/lib/app-config";
import { getAthleteAuthSecret, isAthleteAuthConfigured } from "@/lib/auth/config";
import { findActiveEnrollmentsByParentEmail } from "@/lib/auth/enrollment-access";
import { buildAbsoluteAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { resolveEnrollmentIdFromSelectionKey } from "@/lib/auth/selection-token";
import {
  ATHLETE_SESSION_COOKIE,
  createSignedAthleteSessionToken,
  readAthleteSessionFromRequest,
  sessionMaxAgeSeconds,
  withSelectedEnrollment,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SelectBody = {
  selectionKey?: string;
};

function wantsHtmlRedirect(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    accept.includes("text/html")
  );
}

function unauthorizedResponse(request: Request, html: boolean): Response {
  if (html) {
    return NextResponse.redirect(
      buildAbsoluteAuthRedirectUrl(request, "/dashboard/sign-in"),
      303,
    );
  }
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function forbiddenResponse(request: Request, html: boolean): Response {
  if (html) {
    return NextResponse.redirect(
      buildAbsoluteAuthRedirectUrl(request, "/dashboard/select"),
      303,
    );
  }
  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
}

/**
 * Bind the signed session to one authorized enrollment using an opaque selection key.
 * Never accepts raw Airtable enrollment IDs from the client.
 */
export async function POST(request: Request): Promise<Response> {
  const html = wantsHtmlRedirect(request);

  if (!isAthleteAuthConfigured()) {
    return unauthorizedResponse(request, html);
  }

  const secret = getAthleteAuthSecret();
  if (!secret) {
    return unauthorizedResponse(request, html);
  }

  const session = readAthleteSessionFromRequest(request, secret);
  if (!session) {
    return unauthorizedResponse(request, html);
  }

  let selectionKey = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as SelectBody | null;
    selectionKey = body?.selectionKey?.trim() ?? "";
  } else {
    const form = await request.formData().catch(() => null);
    const value = form?.get("selectionKey");
    selectionKey = typeof value === "string" ? value.trim() : "";
  }

  if (!selectionKey) {
    return forbiddenResponse(request, html);
  }

  const enrollmentId = resolveEnrollmentIdFromSelectionKey(
    selectionKey,
    session.parentEmail,
    session.enrollmentIds,
    secret,
  );
  if (!enrollmentId) {
    return forbiddenResponse(request, html);
  }

  const live = await findActiveEnrollmentsByParentEmail(session.parentEmail);
  const stillAuthorized = live.some(
    (item) =>
      item.enrollmentId === enrollmentId &&
      session.enrollmentIds.includes(item.enrollmentId),
  );
  if (!stillAuthorized) {
    return forbiddenResponse(request, html);
  }

  const refreshedIds = live
    .filter((item) => session.enrollmentIds.includes(item.enrollmentId))
    .map((item) => item.enrollmentId);

  const nextPayload = withSelectedEnrollment(
    { ...session, enrollmentIds: refreshedIds },
    enrollmentId,
  );
  const sessionToken = createSignedAthleteSessionToken(nextPayload, secret);
  const maxAge = sessionMaxAgeSeconds(session);

  if (html) {
    const response = NextResponse.redirect(
      buildAbsoluteAuthRedirectUrl(request, "/dashboard"),
      303,
    );
    response.cookies.set(ATHLETE_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    return response;
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: withBasePath("/dashboard"),
  });
  response.cookies.set(ATHLETE_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return response;
}
