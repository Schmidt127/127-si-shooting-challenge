import type { ValidationResult } from "@/lib/curriculum/submit-validation";

export const CURRICULUM_UPLOAD_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export type CurriculumUploadMime = (typeof CURRICULUM_UPLOAD_ALLOWED_MIME)[number];

const RECORD_ID_RE = /^rec[a-zA-Z0-9]{14}$/;
const ASSIGNMENT_KEY_RE = /^[A-Z0-9][A-Z0-9_]{1,120}$/;
const QUESTION_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,160}$/;

const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

export function curriculumUploadMaxBytes(): number {
  const raw = process.env.CURRICULUM_UPLOAD_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1024 || parsed > 20 * 1024 * 1024) {
    return DEFAULT_MAX_BYTES;
  }
  return Math.floor(parsed);
}

/** Strip path segments and unsafe characters; keep a short basename. */
export function sanitizeUploadFileName(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .trim();
  const truncated = cleaned.slice(0, 180);
  return truncated || "upload.bin";
}

export function isAllowedCurriculumUploadMime(value: string): value is CurriculumUploadMime {
  return (CURRICULUM_UPLOAD_ALLOWED_MIME as readonly string[]).includes(value);
}

export function inferAssetTypeFromMime(mimeType: string): "Homework Image" | "Homework PDF" | "Other" {
  if (mimeType === "application/pdf") return "Homework PDF";
  if (mimeType.startsWith("image/")) return "Homework Image";
  return "Other";
}

export type CurriculumStagingUploadMeta = {
  enrollmentId: string;
  assignmentKey: string;
  questionKey: string;
  draftToken: string | null;
  fileName: string;
  mimeType: CurriculumUploadMime;
  sizeBytes: number;
};

export function parseCurriculumStagingUploadFields(input: {
  enrollmentId: unknown;
  assignmentKey: unknown;
  questionKey: unknown;
  draftToken?: unknown;
  fileName: unknown;
  mimeType: unknown;
  sizeBytes: number;
}): ValidationResult<CurriculumStagingUploadMeta> {
  const enrollmentId = typeof input.enrollmentId === "string" ? input.enrollmentId.trim() : "";
  if (!RECORD_ID_RE.test(enrollmentId)) {
    return { ok: false, status: 422, error: "enrollmentId is invalid." };
  }

  const assignmentKey =
    typeof input.assignmentKey === "string" ? input.assignmentKey.trim() : "";
  if (!ASSIGNMENT_KEY_RE.test(assignmentKey)) {
    return { ok: false, status: 422, error: "assignmentKey is invalid." };
  }

  const questionKey = typeof input.questionKey === "string" ? input.questionKey.trim() : "";
  if (!QUESTION_KEY_RE.test(questionKey)) {
    return { ok: false, status: 422, error: "questionKey is invalid." };
  }

  let draftToken: string | null = null;
  if (input.draftToken != null && input.draftToken !== "") {
    if (typeof input.draftToken !== "string" || input.draftToken.trim().length > 128) {
      return { ok: false, status: 422, error: "draftToken is invalid." };
    }
    draftToken = input.draftToken.trim();
  }

  const mimeType = typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  if (!isAllowedCurriculumUploadMime(mimeType)) {
    return {
      ok: false,
      status: 422,
      error: "Unsupported file type. Allowed: jpeg, png, heic, heif, pdf.",
    };
  }

  const maxBytes = curriculumUploadMaxBytes();
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, status: 422, error: "File is empty or invalid." };
  }
  if (input.sizeBytes > maxBytes) {
    return {
      ok: false,
      status: 422,
      error: `File exceeds the maximum size of ${maxBytes} bytes.`,
    };
  }

  const fileName =
    typeof input.fileName === "string" ? sanitizeUploadFileName(input.fileName) : "upload.bin";

  return {
    ok: true,
    value: {
      enrollmentId,
      assignmentKey,
      questionKey,
      draftToken,
      fileName,
      mimeType,
      sizeBytes: Math.floor(input.sizeBytes),
    },
  };
}
