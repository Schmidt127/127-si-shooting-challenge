import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Short-lived opaque token for POST select/switch bodies — never put in URLs. */
const DEFAULT_SELECTION_TTL_SECONDS = 60 * 60; // 1 hour

export type SelectionTokenClaims = {
  enrollmentId: string;
  parentEmail: string;
  exp: number;
  nonce: string;
};

type EncryptedEnvelope = {
  enrollmentId: string;
  parentEmail: string;
  exp: number;
  nonce: string;
};

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`athlete-select:${secret}`).digest();
}

/**
 * Opaque AES-GCM token — ciphertext only in the client (no visible `rec…` in View Source).
 */
export function createOpaqueSelectionToken(
  input: {
    enrollmentId: string;
    parentEmail: string;
    ttlSeconds?: number;
  },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const envelope: EncryptedEnvelope = {
    enrollmentId: input.enrollmentId,
    parentEmail: input.parentEmail,
    exp: nowSeconds + (input.ttlSeconds ?? DEFAULT_SELECTION_TTL_SECONDS),
    nonce: randomBytes(8).toString("base64url"),
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(envelope), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function verifyOpaqueSelectionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): SelectionTokenClaims | null {
  const [ivPart, tagPart, dataPart] = token.split(".");
  if (!ivPart || !tagPart || !dataPart) return null;

  try {
    const iv = Buffer.from(ivPart, "base64url");
    const tag = Buffer.from(tagPart, "base64url");
    const data = Buffer.from(dataPart, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    const envelope = JSON.parse(decrypted.toString("utf8")) as EncryptedEnvelope;

    if (!envelope.enrollmentId || !envelope.parentEmail || !envelope.nonce) return null;
    if (!Number.isFinite(envelope.exp) || envelope.exp <= nowSeconds) return null;

    return {
      enrollmentId: envelope.enrollmentId,
      parentEmail: envelope.parentEmail,
      exp: envelope.exp,
      nonce: envelope.nonce,
    };
  } catch {
    return null;
  }
}
