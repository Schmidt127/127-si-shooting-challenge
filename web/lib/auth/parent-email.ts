/**
 * Parent email normalization and validation for magic-link auth.
 * Uses Parent Email - Cleaned as the authoritative address shape.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BLOCKED_PERSONAL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function normalizeParentEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function isBlockedPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase() ?? "";
  return BLOCKED_PERSONAL_DOMAINS.has(domain);
}

export function validateParentEmailInput(raw: string): {
  ok: true;
  email: string;
} | {
  ok: false;
  reason: "invalid" | "blocked_personal";
} {
  const email = normalizeParentEmail(raw);
  if (!email) return { ok: false, reason: "invalid" };
  if (isBlockedPersonalEmail(email)) return { ok: false, reason: "blocked_personal" };
  return { ok: true, email };
}
