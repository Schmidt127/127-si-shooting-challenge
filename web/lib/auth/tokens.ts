import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTE_LENGTH = 32;

/** URL-safe opaque token for magic links. */
export function generateMagicLinkToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
  return { raw, hash: hashMagicLinkToken(raw) };
}

export function hashMagicLinkToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function safeCompareTokenHash(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
