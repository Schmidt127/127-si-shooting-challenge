import { withBasePath } from "@/lib/app-config";

function resolveRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // fall through
    }
  }

  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

/**
 * Build an absolute redirect URL for auth route handlers.
 * Next.js route handlers require absolute URLs; paths must include basePath (/shoot).
 */
export function buildAbsoluteAuthRedirectUrl(
  request: Request,
  appRelativePath: string,
  query?: Record<string, string>,
): string {
  const normalizedPath = withBasePath(
    appRelativePath.startsWith("/") ? appRelativePath : `/${appRelativePath}`,
  );
  const redirectUrl = new URL(normalizedPath, `${resolveRequestOrigin(request)}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      redirectUrl.searchParams.set(key, value);
    }
  }

  return redirectUrl.toString();
}
