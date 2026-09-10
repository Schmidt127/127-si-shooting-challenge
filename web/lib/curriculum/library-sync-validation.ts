import { normalizeCurriculumAssignmentKey } from "@/lib/curriculum/homework-link";

export type LibrarySyncPayload = {
  assignmentKey: string;
  homeworkLibraryRecordId?: string;
  phaRecordId?: string;
  assignmentTitle?: string;
  briefDescription?: string;
  /** Hub curriculum version — stored in Notes on create only when no other notes. */
  curriculumVersion?: number;
};

export type ValidationFailure = {
  ok: false;
  status: 400 | 422;
  error: string;
};

export type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const RECORD_ID_RE = /^rec[a-zA-Z0-9]{14}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate Curriculum Hub → SC Homework Library Assignment Key sync body.
 */
export function parseLibrarySyncPayload(body: unknown): ValidationResult<LibrarySyncPayload> {
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }

  const assignmentKey = normalizeCurriculumAssignmentKey(body.assignmentKey);
  if (!assignmentKey) {
    return {
      ok: false,
      status: 422,
      error:
        "assignmentKey is invalid. Expected UPPER_SNAKE like AESOP_CROW_PITCHER (at least one _ segment).",
    };
  }

  let homeworkLibraryRecordId: string | undefined;
  if (body.homeworkLibraryRecordId != null) {
    const raw =
      typeof body.homeworkLibraryRecordId === "string" ? body.homeworkLibraryRecordId.trim() : "";
    if (!RECORD_ID_RE.test(raw)) {
      return { ok: false, status: 422, error: "homeworkLibraryRecordId is invalid." };
    }
    homeworkLibraryRecordId = raw;
  }

  let phaRecordId: string | undefined;
  if (body.phaRecordId != null) {
    const raw = typeof body.phaRecordId === "string" ? body.phaRecordId.trim() : "";
    if (!RECORD_ID_RE.test(raw)) {
      return { ok: false, status: 422, error: "phaRecordId is invalid." };
    }
    phaRecordId = raw;
  }

  let assignmentTitle: string | undefined;
  if (body.assignmentTitle != null) {
    const title = typeof body.assignmentTitle === "string" ? body.assignmentTitle.trim() : "";
    if (!title || title.length > 200) {
      return { ok: false, status: 422, error: "assignmentTitle is invalid." };
    }
    assignmentTitle = title;
  }

  let briefDescription: string | undefined;
  if (body.briefDescription != null) {
    const text = typeof body.briefDescription === "string" ? body.briefDescription.trim() : "";
    if (text.length > 2000) {
      return { ok: false, status: 422, error: "briefDescription exceeds maximum length." };
    }
    if (text.length > 0) briefDescription = text;
  }

  let curriculumVersion: number | undefined;
  if (body.curriculumVersion != null) {
    if (
      typeof body.curriculumVersion !== "number" ||
      !Number.isInteger(body.curriculumVersion) ||
      body.curriculumVersion < 1
    ) {
      return { ok: false, status: 422, error: "curriculumVersion is invalid." };
    }
    curriculumVersion = body.curriculumVersion;
  }

  if (!homeworkLibraryRecordId && !phaRecordId && !assignmentTitle) {
    return {
      ok: false,
      status: 422,
      error:
        "Provide homeworkLibraryRecordId, phaRecordId, or assignmentTitle to locate or create the Homework Library row.",
    };
  }

  return {
    ok: true,
    value: {
      assignmentKey,
      ...(homeworkLibraryRecordId ? { homeworkLibraryRecordId } : {}),
      ...(phaRecordId ? { phaRecordId } : {}),
      ...(assignmentTitle ? { assignmentTitle } : {}),
      ...(briefDescription ? { briefDescription } : {}),
      ...(curriculumVersion != null ? { curriculumVersion } : {}),
    },
  };
}
