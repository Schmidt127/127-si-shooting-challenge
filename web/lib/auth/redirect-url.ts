import { withBasePath } from "@/lib/app-config";

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
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL(normalizedPath, `${requestUrl.protocol}//${requestUrl.host}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      redirectUrl.searchParams.set(key, value);
    }
  }

  return redirectUrl.toString();
}
