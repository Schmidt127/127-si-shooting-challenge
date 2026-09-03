/**
 * Dashboard and XP preview access control (SC-112).
 *
 * Live enrollment-scoped athlete dashboard data requires a valid parent
 * athlete_session cookie. Anonymous visitors must not reach private data via URL params.
 */

import {
  hasAthleteSession,
  isSiteAccessAuthorized,
  isSiteAccessGateEnabled,
} from "@/lib/security";

export const DASHBOARD_PREVIEW_PATH = "/dashboard/preview";

/** True in local Next dev — preserves staff/engineering preview workflows. */
export function isDashboardPreviewDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Staff-only XP preview in production: requires SITE_ACCESS_TOKEN and a valid
 * bearer/cookie/query token. When the gate env var is unset, preview is blocked
 * in production even though the public site remains open.
 */
export function canAccessDashboardPreview(request: Request): boolean {
  if (hasAthleteSession(request)) return true;
  if (isDashboardPreviewDevEnvironment()) return true;

  if (!isSiteAccessGateEnabled()) return false;
  return isSiteAccessAuthorized(request);
}

/** Live athlete dashboard data requires a valid athlete_session cookie. */
export function canLoadLiveAthleteDashboardData(request: Request): boolean {
  return hasAthleteSession(request);
}

/** Build a Request for access checks from server component header/cookie parts. */
export function buildSiteAccessRequest(options: {
  authorizationHeader?: string | null;
  cookieHeader?: string | null;
  queryToken?: string | null;
  pathname?: string;
}): Request {
  const url = new URL(options.pathname ?? DASHBOARD_PREVIEW_PATH, "https://shoot.local");
  const headers = new Headers();
  if (options.authorizationHeader) {
    headers.set("authorization", options.authorizationHeader);
  }
  if (options.cookieHeader) {
    headers.set("cookie", options.cookieHeader);
  }
  if (options.queryToken) {
    url.searchParams.set("site_access_token", options.queryToken);
  }
  return new Request(url, { headers });
}
