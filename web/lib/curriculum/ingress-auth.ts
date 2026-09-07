import { timingSafeEqual } from "node:crypto";

/**
 * Validate Curriculum Hub → SC homework submit ingress secret.
 * Separate from CURRICULUM_HANDOFF_SECRET. Requires ≥32 characters.
 */
export function curriculumIngressSecretValid(candidate: string | null): boolean {
  const expected = process.env.CURRICULUM_INGRESS_SECRET?.trim() ?? "";
  if (expected.length < 32 || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Extract Bearer token from Authorization header (no logging of the value). */
export function bearerTokenFromAuthorization(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
