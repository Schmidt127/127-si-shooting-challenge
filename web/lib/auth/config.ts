/**
 * Athlete parent magic-link auth configuration (SC-112).
 * Values come from environment variables only — never log secrets.
 */

const DEFAULT_TEST_RECIPIENT = "schmidt@fairfieldbasketballclub.com";

function readBool(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isAthleteAuthEnabled(): boolean {
  return readBool("ATHLETE_AUTH_ENABLED");
}

export function getAthleteAuthSecret(): string | null {
  const secret = process.env.ATHLETE_AUTH_SECRET?.trim();
  return secret || null;
}

export function isAthleteAuthConfigured(): boolean {
  return isAthleteAuthEnabled() && Boolean(getAthleteAuthSecret());
}

export function getMagicLinkTokenTtlMs(): number {
  return readInt("ATHLETE_AUTH_TOKEN_TTL_MINUTES", 15) * 60 * 1000;
}

export function getAthleteSessionTtlSeconds(): number {
  return readInt("ATHLETE_AUTH_SESSION_TTL_DAYS", 30) * 24 * 60 * 60;
}

export function isAthleteAuthTestMode(): boolean {
  return readBool("ATHLETE_AUTH_TEST_MODE");
}

export function getAthleteAuthTestRecipient(): string {
  return process.env.ATHLETE_AUTH_TEST_RECIPIENT?.trim() || DEFAULT_TEST_RECIPIENT;
}

export function getMagicLinkRateLimitPerEmail(): number {
  return readInt("ATHLETE_AUTH_RATE_LIMIT_EMAIL_PER_HOUR", 5);
}

export function getMagicLinkRateLimitPerIp(): number {
  return readInt("ATHLETE_AUTH_RATE_LIMIT_IP_PER_HOUR", 20);
}

export function isAthleteAuthDevBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return readBool("ATHLETE_AUTH_DEV_BYPASS");
}

export function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function getResendFromEmail(): string | null {
  return process.env.RESEND_FROM_EMAIL?.trim() || null;
}

export function hasUpstashRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export const MAGIC_LINK_CONFIRMATION_MESSAGE =
  "If that email is registered for the Shooting Challenge, we sent a secure sign-in link. Check your inbox and spam folder.";

export const MAGIC_LINK_ERROR_MESSAGES = {
  expired: "This sign-in link has expired. Request a new link from the dashboard sign-in page.",
  used: "This sign-in link was already used. Request a new link from the dashboard sign-in page.",
  invalid: "This sign-in link is not valid. Request a new link from the dashboard sign-in page.",
  misconfigured: "Family sign-in is temporarily unavailable. Please try again later.",
} as const;
