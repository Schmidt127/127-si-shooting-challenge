/**
 * Auth and access-control helpers for private dev and future admin routes.
 */

/** Optional bearer token gate for early private deployments on Vercel. */
export function isSiteAccessAuthorized(request: Request): boolean {
  const required = process.env.SITE_ACCESS_TOKEN?.trim();

  if (!required) {
    return true;
  }

  const header = request.headers.get("authorization") ?? "";
  const [, token] = header.match(/^Bearer\s+(.+)$/i) ?? [];

  return token === required;
}
