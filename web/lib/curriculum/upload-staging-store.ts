/**
 * Curriculum Hub file staging store (server-only).
 *
 * Preferred backends (in order):
 * 1. Private S3 prefix when CURRICULUM_STAGING_S3_BUCKET + AWS creds are set
 * 2. Upstash Redis (same pattern as curriculum handoff) with 24h TTL
 * 3. In-process memory Map (local/tests only — not durable across instances)
 *
 * Staging never creates permanent Submission Assets. Bind on final submit.
 * Disposable staging entries expire after 24h (document cleanup in audits).
 */

import { createHash, randomBytes } from "node:crypto";

import { hasUpstashRedisConfig } from "@/lib/auth/config";
import type { CurriculumUploadMime } from "@/lib/curriculum/upload-staging-validation";

export const CURRICULUM_STAGING_TTL_MS = 24 * 60 * 60 * 1000;
const REDIS_PREFIX = "curriculum-upload-staging:";

export type CurriculumStagingRecord = {
  stagingId: string;
  enrollmentId: string;
  assignmentKey: string;
  questionKey: string;
  fileName: string;
  mimeType: CurriculumUploadMime;
  sizeBytes: number;
  /** Fetch token for optional short-lived delivery URL (Airtable attachment pull). */
  fetchToken: string;
  createdAt: number;
  expiresAt: number;
  consumedAt: number | null;
  storage: "memory" | "redis" | "s3";
  /** Present for memory/redis backends. */
  bytesBase64?: string;
  /** Present for s3 backend. */
  s3Bucket?: string;
  s3Key?: string;
};

const memoryStore = new Map<string, CurriculumStagingRecord>();

function stagingId(): string {
  return `stg_${randomBytes(16).toString("hex")}`;
}

function fetchToken(): string {
  return randomBytes(24).toString("base64url");
}

async function upstashCommand(args: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const response = await fetch(`${url}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Curriculum staging store failed (${response.status})`);
  return response.json();
}

function s3StagingConfigured(): boolean {
  return Boolean(
    process.env.CURRICULUM_STAGING_S3_BUCKET?.trim() &&
      process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
}

function s3Region(): string {
  return process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || "us-east-2";
}

/**
 * PutObject via AWS SDK when available. Returns null if SDK/credentials unavailable.
 * Does not throw AWS secret values.
 */
async function putStagingObjectS3(input: {
  stagingId: string;
  body: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ bucket: string; key: string } | null> {
  if (!s3StagingConfigured()) return null;
  const bucket = process.env.CURRICULUM_STAGING_S3_BUCKET!.trim();
  const key = `curriculum-staging/${input.stagingId}/${input.fileName}`;

  try {
    // Optional dependency — web package may not ship @aws-sdk; fail soft to Redis/memory.
    const aws = await import("@aws-sdk/client-s3").catch(() => null);
    if (!aws) return null;
    const client = new aws.S3Client({ region: s3Region() });
    await client.send(
      new aws.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.body,
        ContentType: input.mimeType,
        ServerSideEncryption: "AES256",
      }),
    );
    return { bucket, key };
  } catch {
    return null;
  }
}

async function getStagingObjectS3(bucket: string, key: string): Promise<Buffer | null> {
  try {
    const aws = await import("@aws-sdk/client-s3").catch(() => null);
    if (!aws) return null;
    const client = new aws.S3Client({ region: s3Region() });
    const result = await client.send(new aws.GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

export async function storeCurriculumStagingUpload(input: {
  enrollmentId: string;
  assignmentKey: string;
  questionKey: string;
  fileName: string;
  mimeType: CurriculumUploadMime;
  sizeBytes: number;
  bytes: Buffer;
  now?: number;
}): Promise<CurriculumStagingRecord> {
  const now = input.now ?? Date.now();
  const id = stagingId();
  const token = fetchToken();
  const base: Omit<CurriculumStagingRecord, "storage" | "bytesBase64" | "s3Bucket" | "s3Key"> = {
    stagingId: id,
    enrollmentId: input.enrollmentId,
    assignmentKey: input.assignmentKey,
    questionKey: input.questionKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    fetchToken: token,
    createdAt: now,
    expiresAt: now + CURRICULUM_STAGING_TTL_MS,
    consumedAt: null,
  };

  const s3 = await putStagingObjectS3({
    stagingId: id,
    body: input.bytes,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });
  if (s3) {
    const record: CurriculumStagingRecord = {
      ...base,
      storage: "s3",
      s3Bucket: s3.bucket,
      s3Key: s3.key,
    };
    // Keep metadata in Redis/memory so bind can resolve without listing S3.
    if (hasUpstashRedisConfig()) {
      const ttlSeconds = Math.ceil(CURRICULUM_STAGING_TTL_MS / 1000);
      await upstashCommand([
        "SET",
        `${REDIS_PREFIX}${id}`,
        JSON.stringify(record),
        "EX",
        String(ttlSeconds),
      ]);
    } else {
      memoryStore.set(id, record);
    }
    return record;
  }

  const withBytes: CurriculumStagingRecord = {
    ...base,
    storage: hasUpstashRedisConfig() ? "redis" : "memory",
    bytesBase64: input.bytes.toString("base64"),
  };

  if (hasUpstashRedisConfig()) {
    const ttlSeconds = Math.ceil(CURRICULUM_STAGING_TTL_MS / 1000);
    await upstashCommand([
      "SET",
      `${REDIS_PREFIX}${id}`,
      JSON.stringify(withBytes),
      "EX",
      String(ttlSeconds),
    ]);
    return { ...withBytes, bytesBase64: undefined };
  }

  memoryStore.set(id, withBytes);
  return { ...withBytes, bytesBase64: undefined };
}

async function loadRaw(stagingIdValue: string): Promise<CurriculumStagingRecord | null> {
  if (hasUpstashRedisConfig()) {
    try {
      const result = (await upstashCommand(["GET", `${REDIS_PREFIX}${stagingIdValue}`])) as {
        result?: string | null;
      };
      if (!result?.result) return null;
      return JSON.parse(result.result) as CurriculumStagingRecord;
    } catch {
      return null;
    }
  }
  return memoryStore.get(stagingIdValue) ?? null;
}

export async function getCurriculumStagingRecord(
  stagingIdValue: string,
): Promise<CurriculumStagingRecord | null> {
  const record = await loadRaw(stagingIdValue);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) return null;
  return record;
}

export async function loadCurriculumStagingBytes(
  record: CurriculumStagingRecord,
): Promise<Buffer | null> {
  if (record.storage === "s3" && record.s3Bucket && record.s3Key) {
    return getStagingObjectS3(record.s3Bucket, record.s3Key);
  }
  const raw = await loadRaw(record.stagingId);
  if (!raw?.bytesBase64) return null;
  return Buffer.from(raw.bytesBase64, "base64");
}

export async function markCurriculumStagingConsumed(stagingIdValue: string): Promise<void> {
  const record = await loadRaw(stagingIdValue);
  if (!record) return;
  const updated = { ...record, consumedAt: Date.now() };
  if (hasUpstashRedisConfig()) {
    const remainingMs = Math.max(1000, record.expiresAt - Date.now());
    const ttlSeconds = Math.ceil(remainingMs / 1000);
    await upstashCommand([
      "SET",
      `${REDIS_PREFIX}${stagingIdValue}`,
      JSON.stringify(updated),
      "EX",
      String(ttlSeconds),
    ]);
    return;
  }
  memoryStore.set(stagingIdValue, updated);
}

/** Stable Source Attachment ID for curriculum SA idempotency. */
export function buildCurriculumAssetSourceId(input: {
  homeworkCompletionId: string;
  attemptId: string;
  questionKey: string;
  stagingId: string;
}): string {
  const material = [
    "curriculum",
    input.homeworkCompletionId,
    input.attemptId,
    input.questionKey,
    input.stagingId,
  ].join("|");
  // Keep under Airtable single-line limits while remaining stable.
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `curriculum:${hash}`;
}

/** Test helper — clear memory staging. */
export function __resetCurriculumStagingMemoryForTests(): void {
  memoryStore.clear();
}
