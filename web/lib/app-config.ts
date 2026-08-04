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

/** Official public host / logo landing target for Shooting Challenge. */
const DEFAULT_LANDING_URL = "https://www.fairfieldbasketballclub.com";

/**
 * Normalize hub / landing URL.
 *
 * Defaults to the official FBC host. Still repairs the known historical
 * `hooopchallenges.com` typo when that value appears in env, and normalizes
 * apex hosts to `www`.
 */
export function resolveLandingUrl(raw: string | undefined | null): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return DEFAULT_LANDING_URL;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();

    // Known typo observed in live PROD HTML (2026-07-25 browser QA).
    if (host === "hooopchallenges.com" || host === "www.hooopchallenges.com") {
      url.hostname = "www.hoopchallenges.com";
    } else if (host === "hoopchallenges.com") {
      url.hostname = "www.hoopchallenges.com";
    } else if (host === "fairfieldbasketballclub.com") {
      url.hostname = "www.fairfieldbasketballclub.com";
    }

    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_LANDING_URL;
  }
}

export const LANDING_URL = resolveLandingUrl(process.env.NEXT_PUBLIC_LANDING_URL);
