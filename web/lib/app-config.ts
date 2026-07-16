/** Shooting Challenge app metadata — this repo is Shooting Challenge only. */

export const SHOOTING_CHALLENGE = {
  id: "shoot",
  name: "Shooting Challenge",
  description:
    "Track makes and attempts, climb levels, and compete on the live leaderboard — built for serious shooting reps.",
  publicPath: "/shoot",
} as const;

/**
 * Public URL prefix for static assets and routes.
 * Must match next.config `basePath` / NEXT_PUBLIC_BASE_PATH (default `/shoot`).
 */
export const APP_BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH?.trim() || SHOOTING_CHALLENGE.publicPath;

/** Prefix a root-relative public asset path with the app basePath. */
export function withBasePath(path: string): string {
  if (!path) return APP_BASE_PATH;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === APP_BASE_PATH || normalized.startsWith(`${APP_BASE_PATH}/`)) {
    return normalized;
  }
  return `${APP_BASE_PATH}${normalized}`;
}

export const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL?.trim() || "https://www.hoopchallenges.com";
