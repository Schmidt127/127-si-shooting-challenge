import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Opaque enrollment selection keys for SC-112 multi-child auth.
 * Keys are HMAC digests of parentEmail + enrollmentId — never Airtable `rec…` IDs.
 * Resolution requires recomputing against the session's authorized enrollment set.
 */

function safeEqualUtf8(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function mintEnrollmentSelectionKey(
  enrollmentId: string,
  parentEmail: string,
  secret: string,
): string {
  const email = parentEmail.trim().toLowerCase();
  return createHmac("sha256", secret)
    .update(`sel|v1|${email}|${enrollmentId}`)
    .digest("base64url");
}

export function resolveEnrollmentIdFromSelectionKey(
  selectionKey: string,
  parentEmail: string,
  enrollmentIds: readonly string[],
  secret: string,
): string | null {
  const trimmed = selectionKey.trim();
  if (!trimmed) return null;

  for (const enrollmentId of enrollmentIds) {
    const expected = mintEnrollmentSelectionKey(enrollmentId, parentEmail, secret);
    if (safeEqualUtf8(trimmed, expected)) {
      return enrollmentId;
    }
  }
  return null;
}

export function mapEnrollmentsToSelectionKeys(
  enrollmentIds: readonly string[],
  parentEmail: string,
  secret: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const enrollmentId of enrollmentIds) {
    map.set(enrollmentId, mintEnrollmentSelectionKey(enrollmentId, parentEmail, secret));
  }
  return map;
}
