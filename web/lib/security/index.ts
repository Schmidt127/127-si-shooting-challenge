/**
 * Auth and access-control helpers for private dev and future admin routes.
 *
 * `SITE_ACCESS_TOKEN` is a deployment preview gate only.
 * Athlete parent magic-link sessions (SC-112) use a separate signed cookie when enabled.
 */

import {
  getAthleteAuthSecret,
  isAthleteAuthEnabled,
} from "@/lib/auth/config";
import { readAthleteSessionFromRequest } from "@/lib/auth/session";

const SITE_ACCESS_COOKIE = "site_access_token";
const SITE_ACCESS_QUERY = "site_access_token";

/**
 * Path prefixes that require a real athlete/staff session when athlete auth is enabled.
 */
export const ATHLETE_PROTECTED_PATH_PREFIXES = ["/dashboard"] as const;

export const STAFF_PROTECTED_PATH_PREFIXES = ["/admin"] as const;

/** True when pathname is under an athlete-protected prefix. */
export function isAthleteProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if (path === "/dashboard/sign-in") return false;
  return ATHLETE_PROTECTED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** True when pathname is under a future staff-protected prefix (scaffolding only). */
export function isStaffProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return STAFF_PROTECTED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isDashboardProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if (path === "/dashboard/sign-in") return false;
  if (path === "/dashboard/preview") return false;
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

export function hasAthleteSession(request: Request): boolean {
  if (!isAthleteAuthEnabled()) return false;
  const secret = getAthleteAuthSecret();
  if (!secret) return false;
  return Boolean(readAthleteSessionFromRequest(request, secret));
}

function getRequiredSiteAccessToken(): string | null {
  const required = process.env.SITE_ACCESS_TOKEN?.trim();
  return required || null;
}

/** Token supplied via Bearer header, cookie, or preview query param. */
export function readSiteAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const [, bearer] = header.match(/^Bearer\s+(.+)$/i) ?? [];
  if (bearer?.trim()) return bearer.trim();

  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SITE_ACCESS_COOKIE) {
      const value = rest.join("=").trim();
      if (value) return decodeURIComponent(value);
    }
  }

  try {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get(SITE_ACCESS_QUERY)?.trim();
    if (queryToken) return queryToken;
  } catch {
    // ignore invalid URLs in tests
  }

  return null;
}

/** Optional bearer/cookie/query gate for early private deployments on Vercel. */
export function isSiteAccessAuthorized(request: Request): boolean {
  const required = getRequiredSiteAccessToken();
  if (!required) return true;

  return readSiteAccessToken(request) === required;
}

export function siteAccessCookieName(): string {
  return SITE_ACCESS_COOKIE;
}

export function siteAccessQueryParam(): string {
  return SITE_ACCESS_QUERY;
}

export function isSiteAccessGateEnabled(): boolean {
  return Boolean(getRequiredSiteAccessToken());
}

export { getAthleteSession } from "@/lib/auth/get-athlete-session";
