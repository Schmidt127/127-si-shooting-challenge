/**
 * Auth and access-control helpers for private dev and future admin routes.
 *
 * IMPORTANT: Nothing here is athlete authentication (SC-112 — Mike decision).
 * `SITE_ACCESS_TOKEN` is a deployment preview gate only. Do not treat presence
 * of these helpers as proof that `/dashboard` or `/athletes/*` are secured for
 * real participant data.
 */

const SITE_ACCESS_COOKIE = "site_access_token";
const SITE_ACCESS_QUERY = "site_access_token";

/**
 * Path prefixes that will require a real athlete/staff session after SC-112.
 * Used for documentation, release tests, and future middleware wiring.
 * Matching a path here does **not** currently enforce athlete auth.
 */
export const ATHLETE_PROTECTED_PATH_PREFIXES = ["/dashboard", "/athletes"] as const;

export const STAFF_PROTECTED_PATH_PREFIXES = ["/admin"] as const;

/** True when pathname is under a future athlete-protected prefix (scaffolding only). */
export function isAthleteProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
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

/**
 * Placeholder for post-SC-112 session checks.
 * Always returns false today — never claim a visitor is an authenticated athlete.
 */
export function hasAthleteSession(request: Request): boolean {
  void request;
  return false;
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
