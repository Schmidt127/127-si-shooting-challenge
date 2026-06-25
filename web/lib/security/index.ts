/**
 * Auth and access-control helpers for private dev and future admin routes.
 */

const SITE_ACCESS_COOKIE = "site_access_token";
const SITE_ACCESS_QUERY = "site_access_token";

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
