import { createHash, randomBytes } from "node:crypto";

import {
  createAirtableRecord,
  listAirtableRecords,
  updateAirtableRecord,
  uploadAirtableAttachmentContent,
} from "@/lib/airtable/client";
import { AirtableApiError } from "@/lib/airtable/errors";
import { escapeAirtableString } from "@/lib/data/public-athlete-profile";
import {
  buildCurriculumAssetSourceId,
  getCurriculumStagingRecord,
  loadCurriculumStagingBytes,
  markCurriculumStagingConsumed,
  storeCurriculumStagingUpload,
} from "@/lib/curriculum/upload-staging-store";
import {
  inferAssetTypeFromMime,
  parseCurriculumStagingUploadFields,
} from "@/lib/curriculum/upload-staging-validation";
import type { CurriculumSubmitAssetRef } from "@/lib/curriculum/submit-validation";

/** Submission Assets table — not in public athlete registry. */
export const SUBMISSION_ASSETS_TABLE = {
  name: "Submission Assets",
  id: "tblhMLKxQK77agtME",
  airtableAttachmentFieldId: "fldrGt7IsWDUAKfzD",
} as const;

export type CurriculumStagingUploadResult =
  | {
      ok: true;
      stagingId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      expiresAt: string;
    }
  | { ok: false; status: 400 | 422 | 503; error: string };

export async function processCurriculumStagingUpload(input: {
  enrollmentId: unknown;
  assignmentKey: unknown;
  questionKey: unknown;
  draftToken?: unknown;
  fileName: unknown;
  mimeType: unknown;
  bytes: Buffer;
}): Promise<CurriculumStagingUploadResult> {
  const parsed = parseCurriculumStagingUploadFields({
    enrollmentId: input.enrollmentId,
    assignmentKey: input.assignmentKey,
    questionKey: input.questionKey,
    draftToken: input.draftToken,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
  });
  if (!parsed.ok) return parsed;

  try {
    const stored = await storeCurriculumStagingUpload({
      enrollmentId: parsed.value.enrollmentId,
      assignmentKey: parsed.value.assignmentKey,
      questionKey: parsed.value.questionKey,
      fileName: parsed.value.fileName,
      mimeType: parsed.value.mimeType,
      sizeBytes: parsed.value.sizeBytes,
      bytes: input.bytes,
    });

    return {
      ok: true,
      stagingId: stored.stagingId,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      expiresAt: new Date(stored.expiresAt).toISOString(),
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: "File staging temporarily unavailable.",
    };
  }
}

/**
 * Build Submission Asset write fields for Structured Curriculum files.
 *
 * Architecture (locked):
 * - No Daily Submission (Submission - Linked stays blank)
 * - Link HC + Enrollment
 * - Asset Purpose = Homework 1 → Upload Destination formula = Homework Completions
 * - Asset Slot = HW1 (schema singleSelect; cannot hold free-text questionKey)
 * - Asset Label = questionKey for traceability (e.g. SHOT_TRACKER_SETUP.1-2.Q07)
 * - file_upload answers are NOT written as Homework Response rows; association is via Asset Label
 */
export function buildCurriculumSubmissionAssetFields(input: {
  enrollmentId: string;
  homeworkCompletionId: string;
  questionKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sourceAttachmentId: string;
  attachmentUrl?: string;
}): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    "Enrollment - Linked": [input.enrollmentId],
    "Homework Completions": [input.homeworkCompletionId],
    // Intentionally omit "Submission - Linked" (blank — no Daily Submission).
    "Asset Purpose": "Homework 1",
    "Asset Slot": "HW1",
    "Asset Label": input.questionKey,
    "Asset Type": inferAssetTypeFromMime(input.mimeType),
    "Original File Name": input.fileName,
    "File MIME Type": input.mimeType,
    "File Size Bytes": input.sizeBytes,
    "Source Attachment ID": input.sourceAttachmentId,
    "Upload Status": "Pending Link",
    // Arm Send to Make only when attachment is present on create (URL path).
    // Content-upload path arms after uploadAirtableAttachmentContent succeeds.
    "Send to Make Trigger": Boolean(input.attachmentUrl),
  };

  if (input.attachmentUrl) {
    fields["Airtable Attachment"] = [
      { url: input.attachmentUrl, filename: input.fileName },
    ];
  }

  return fields;
}

export type BoundCurriculumAsset = {
  assetId: string;
  questionKey: string;
  stagingId: string;
  sourceAttachmentId: string;
  created: boolean;
};

async function findAssetBySourceAttachmentId(
  sourceAttachmentId: string,
): Promise<string | null> {
  const response = await listAirtableRecords<{ "Source Attachment ID"?: unknown }>({
    tableName: SUBMISSION_ASSETS_TABLE.name,
    filterByFormula: `{Source Attachment ID}='${escapeAirtableString(sourceAttachmentId)}'`,
    fields: ["Source Attachment ID"],
    maxRecords: 2,
    revalidateSeconds: 0,
  });
  return response.records[0]?.id ?? null;
}

/**
 * Bind one staging ref into a permanent Submission Asset after HC exists.
 * Idempotent on Source Attachment ID (retry must not duplicate SA).
 */
export async function bindCurriculumStagingAsset(input: {
  enrollmentId: string;
  homeworkCompletionId: string;
  attemptId: string;
  asset: CurriculumSubmitAssetRef;
  /** Optional absolute URL Airtable can fetch (presigned / staging delivery). */
  attachmentFetchUrl?: string | null;
}): Promise<BoundCurriculumAsset> {
  const sourceAttachmentId = buildCurriculumAssetSourceId({
    homeworkCompletionId: input.homeworkCompletionId,
    attemptId: input.attemptId,
    questionKey: input.asset.questionKey,
    stagingId: input.asset.stagingId,
  });

  const existingId = await findAssetBySourceAttachmentId(sourceAttachmentId);
  if (existingId) {
    return {
      assetId: existingId,
      questionKey: input.asset.questionKey,
      stagingId: input.asset.stagingId,
      sourceAttachmentId,
      created: false,
    };
  }

  const staging = await getCurriculumStagingRecord(input.asset.stagingId);
  if (!staging) {
    throw Object.assign(new Error("Staging upload not found or expired."), {
      code: "STAGING_MISSING" as const,
    });
  }
  if (staging.enrollmentId !== input.enrollmentId) {
    throw Object.assign(new Error("Staging upload enrollment mismatch."), {
      code: "STAGING_MISMATCH" as const,
    });
  }
  if (staging.questionKey !== input.asset.questionKey) {
    throw Object.assign(new Error("Staging upload questionKey mismatch."), {
      code: "STAGING_MISMATCH" as const,
    });
  }

  const fields = buildCurriculumSubmissionAssetFields({
    enrollmentId: input.enrollmentId,
    homeworkCompletionId: input.homeworkCompletionId,
    questionKey: input.asset.questionKey,
    fileName: input.asset.fileName || staging.fileName,
    mimeType: input.asset.mimeType || staging.mimeType,
    sizeBytes: input.asset.sizeBytes || staging.sizeBytes,
    sourceAttachmentId,
    attachmentUrl: input.attachmentFetchUrl ?? undefined,
  });

  const created = await createAirtableRecord({
    tableName: SUBMISSION_ASSETS_TABLE.name,
    fields,
    typecast: true,
  });

  if (!input.attachmentFetchUrl) {
    const bytes = await loadCurriculumStagingBytes(staging);
    if (!bytes) {
      throw Object.assign(new Error("Staging file bytes unavailable."), {
        code: "STAGING_BYTES_MISSING" as const,
      });
    }
    await uploadAirtableAttachmentContent({
      recordId: created.id,
      attachmentFieldId: SUBMISSION_ASSETS_TABLE.airtableAttachmentFieldId,
      fileName: staging.fileName,
      mimeType: staging.mimeType,
      bytes,
    });
    // Re-arm trigger after content upload so Ready formula sees the attachment.
    await updateAirtableRecord({
      tableName: SUBMISSION_ASSETS_TABLE.name,
      recordId: created.id,
      fields: {
        "Upload Status": "Pending Link",
        "Send to Make Trigger": true,
      },
      typecast: true,
    });
  }

  await markCurriculumStagingConsumed(input.asset.stagingId);

  return {
    assetId: created.id,
    questionKey: input.asset.questionKey,
    stagingId: input.asset.stagingId,
    sourceAttachmentId,
    created: true,
  };
}

export async function bindCurriculumSubmitAssets(input: {
  enrollmentId: string;
  homeworkCompletionId: string;
  attemptId: string;
  assets: CurriculumSubmitAssetRef[];
  buildAttachmentFetchUrl?: (stagingId: string, fetchToken: string) => string | null;
}): Promise<BoundCurriculumAsset[]> {
  const bound: BoundCurriculumAsset[] = [];
  for (const asset of input.assets) {
    const staging = await getCurriculumStagingRecord(asset.stagingId);
    const fetchUrl =
      staging && input.buildAttachmentFetchUrl
        ? input.buildAttachmentFetchUrl(staging.stagingId, staging.fetchToken)
        : null;
    try {
      const result = await bindCurriculumStagingAsset({
        enrollmentId: input.enrollmentId,
        homeworkCompletionId: input.homeworkCompletionId,
        attemptId: input.attemptId,
        asset,
        attachmentFetchUrl: fetchUrl,
      });
      bound.push(result);
    } catch (error) {
      if (error instanceof AirtableApiError) throw error;
      throw error;
    }
  }
  return bound;
}

/** Content-hash helper for tests / diagnostics (not logged with file bytes). */
export function hashStagingBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function newStagingNonce(): string {
  return randomBytes(8).toString("hex");
}
