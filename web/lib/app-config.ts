/** Shooting Challenge app metadata — this repo is Shooting Challenge only. */

export const SHOOTING_CHALLENGE = {
  id: "shoot",
  name: "Shooting Challenge",
  description:
    "Track makes and attempts, climb levels, and compete on the live leaderboard — built for serious shooting reps.",
  publicPath: "/shoot",
} as const;

/**
 * Official public landing origin (Fairfield Basketball Club).
 * Shooting Challenge mounts at `{PUBLIC_LANDING_ORIGIN}/shoot`.
 */
export const PUBLIC_LANDING_ORIGIN = "https://www.fairfieldbasketballclub.com";

/** Canonical public Shooting Challenge URL prefix (landing + `/shoot`). */
export const PUBLIC_SITE_ORIGIN = `${PUBLIC_LANDING_ORIGIN}${SHOOTING_CHALLENGE.publicPath}`;

/** Hosts that must never remain as the primary public destination. */
const LEGACY_LANDING_HOSTS = new Set([
  "hoopchallenges.com",
  "www.hoopchallenges.com",
  "hooopchallenges.com",
  "www.hooopchallenges.com",
]);

const CANONICAL_LANDING_HOST = "www.fairfieldbasketballclub.com";

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

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function normalizePublicHostname(hostname: string): string {
  const host = hostname.toLowerCase();
  if (
    LEGACY_LANDING_HOSTS.has(host) ||
    host === "fairfieldbasketballclub.com" ||
    host === CANONICAL_LANDING_HOST
  ) {
    return CANONICAL_LANDING_HOST;
  }
  return host;
}

/**
 * Normalize hub / landing URL.
 *
 * - Missing / blank / malformed → official Fairfield landing
 * - Legacy Hoop Challenges hosts (incl. known `hooop` typo) → Fairfield host
 * - Bare `fairfieldbasketballclub.com` → `www.` canonical host
 * - Path is preserved (e.g. `/programs`)
 */
export function resolveLandingUrl(raw: string | undefined | null): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return PUBLIC_LANDING_ORIGIN;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    url.hostname = normalizePublicHostname(url.hostname);
    url.hash = "";
    return stripTrailingSlash(url.toString());
  } catch {
    return PUBLIC_LANDING_ORIGIN;
  }
}

/**
 * Normalize canonical site URL used for metadata (`metadataBase`).
 * Ensures `/shoot` basePath and never falls back to Hoop Challenges.
 */
export function resolveSiteUrl(
  raw: string | undefined | null,
  basePath: string = APP_BASE_PATH,
): string {
  const normalizedBase =
    !basePath || basePath === "/"
      ? SHOOTING_CHALLENGE.publicPath
      : basePath.startsWith("/")
        ? basePath
        : `/${basePath}`;
  const fallback = `${PUBLIC_LANDING_ORIGIN}${normalizedBase}`;

  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return fallback;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    url.hostname = normalizePublicHostname(url.hostname);
    url.hash = "";

    const path = stripTrailingSlash(url.pathname || "") || "";
    if (!path || path === "/") {
      url.pathname = normalizedBase;
    } else if (
      path !== normalizedBase &&
      !path.startsWith(`${normalizedBase}/`)
    ) {
      // Keep an explicit non-root path (rare); otherwise prefer /shoot.
      url.pathname = path;
    }

    return stripTrailingSlash(url.toString());
  } catch {
    return fallback;
  }
}

export const LANDING_URL = resolveLandingUrl(process.env.NEXT_PUBLIC_LANDING_URL);

export const SITE_URL = resolveSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  APP_BASE_PATH,
);
