/**
 * Parent email normalization and validation for magic-link auth.
 * Uses Parent Email - Cleaned as the authoritative address shape.
 *
 * Personal mailbox providers (including Gmail) are allowed when they match an
 * eligible Active enrollment. Access is gated by registration match, not domain.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeParentEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function validateParentEmailInput(raw: string): {
  ok: true;
  email: string;
} | {
  ok: false;
  reason: "invalid";
} {
  const email = normalizeParentEmail(raw);
  if (!email) return { ok: false, reason: "invalid" };
  return { ok: true, email };
}
