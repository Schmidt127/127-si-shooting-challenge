import { NextResponse } from "next/server";

import { MAGIC_LINK_ERROR_MESSAGES } from "@/lib/auth/config";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link-service";
import { ATHLETE_SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToSignIn(reason: keyof typeof MAGIC_LINK_ERROR_MESSAGES): NextResponse {
  const url = new URL("/dashboard/sign-in", "http://localhost");
  url.searchParams.set("error", reason);
  return NextResponse.redirect(`${url.pathname}${url.search}`);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const result = await verifyMagicLinkToken(token);
  if (!result.ok) {
    const reason = result.reason === "misconfigured" ? "misconfigured" : result.reason;
    return redirectToSignIn(reason === "misconfigured" ? "misconfigured" : reason);
  }

  const response = NextResponse.redirect("/dashboard");
  response.cookies.set(ATHLETE_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: result.maxAgeSeconds,
  });

  return response;
}
