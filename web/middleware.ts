import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isSiteAccessAuthorized,
  readSiteAccessToken,
  siteAccessCookieName,
  siteAccessQueryParam,
} from "@/lib/security";

export function middleware(request: NextRequest) {
  if (isSiteAccessAuthorized(request)) {
    const required = process.env.SITE_ACCESS_TOKEN?.trim();
    const queryToken = request.nextUrl.searchParams.get(siteAccessQueryParam());

    if (required && queryToken === required) {
      const url = request.nextUrl.clone();
      url.searchParams.delete(siteAccessQueryParam());

      const response = NextResponse.redirect(url);
      response.cookies.set(siteAccessCookieName(), queryToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    }

    return NextResponse.next();
  }

  const tokenFromRequest = readSiteAccessToken(request);
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (isApiRoute) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
        hint:
          tokenFromRequest === null
            ? `Provide ${siteAccessQueryParam()} query param, site_access cookie, or Authorization Bearer token.`
            : "Invalid site access token.",
      },
      { status: 401 },
    );
  }

  return new NextResponse(
    "Unauthorized. This preview deployment requires a site access token.",
    {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|brand/).*)",
  ],
};
