import { withBasePath } from "@/lib/app-config";

/**
 * Public Family Dashboard entry point.
 *
 * App href is relative to Next.js `basePath` (`/shoot`). Use this with
 * `next/link` — do not prefix `/shoot` in the href or the path doubles.
 * Private dashboard data lives at `/dashboard` and stays auth-gated.
 */
export const FAMILY_DASHBOARD_APP_HREF = "/dashboard/sign-in" as const;

export const FAMILY_DASHBOARD_LABEL = "Family Dashboard" as const;

export const FAMILY_DASHBOARD_DESCRIPTION =
  "View your child's shots, XP, homework, video feedback, and awards.";

/** Public URL path including the configured basePath (e.g. `/shoot/dashboard/sign-in`). */
export function familyDashboardPublicPath(): string {
  return withBasePath(FAMILY_DASHBOARD_APP_HREF);
}
