import type { CurriculumGradeBand } from "@/lib/curriculum/handoff";

export const CURRICULUM_GRADE_BANDS = ["K-3", "4-6", "7-8", "9-12"] as const;

export type CurriculumSubmitAnswer = {
  questionKey: string;
  questionOrder: number;
  responseType: string;
  promptSnapshot: string;
  value: string;
};

export type CurriculumSubmitPayload = {
  enrollmentId: string;
  assignmentKey: string;
  curriculumVersion: number;
  gradeBand: CurriculumGradeBand;
  attemptNumber: number;
  parentAttemptNumber: number | null;
  submittedAt: string;
  answers: CurriculumSubmitAnswer[];
};

export type CurriculumSubmitReceipt = {
  submissionId: string;
  homeworkCompletionId: string;
  attemptNumber: number;
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
const ASSIGNMENT_KEY_RE = /^[A-Z0-9][A-Z0-9_]{1,120}$/;
const QUESTION_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,160}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGradeBand(value: unknown): value is CurriculumGradeBand {
  return (
    typeof value === "string" &&
    (CURRICULUM_GRADE_BANDS as readonly string[]).includes(value)
  );
}

/** Idempotency-Key header: required, opaque, no secrets/answers. */
export function parseIdempotencyKey(raw: string | null): ValidationResult<string> {
  const key = raw?.trim() ?? "";
  if (!key) {
    return { ok: false, status: 400, error: "Idempotency-Key header is required." };
  }
  if (key.length < 8 || key.length > 128) {
    return { ok: false, status: 422, error: "Idempotency-Key length is invalid." };
  }
  if (/[\r\n]/.test(key)) {
    return { ok: false, status: 422, error: "Idempotency-Key is invalid." };
  }
  return { ok: true, value: key };
}

function parseAnswer(raw: unknown, index: number): ValidationResult<CurriculumSubmitAnswer> {
  if (!isPlainObject(raw)) {
    return { ok: false, status: 422, error: `answers[${index}] must be an object.` };
  }
  const questionKey = typeof raw.questionKey === "string" ? raw.questionKey.trim() : "";
  if (!QUESTION_KEY_RE.test(questionKey)) {
    return { ok: false, status: 422, error: `answers[${index}].questionKey is invalid.` };
  }
  if (typeof raw.questionOrder !== "number" || !Number.isInteger(raw.questionOrder) || raw.questionOrder < 1) {
    return { ok: false, status: 422, error: `answers[${index}].questionOrder is invalid.` };
  }
  const responseType = typeof raw.responseType === "string" ? raw.responseType.trim() : "";
  if (!responseType || responseType.length > 64) {
    return { ok: false, status: 422, error: `answers[${index}].responseType is invalid.` };
  }
  if (typeof raw.promptSnapshot !== "string" || raw.promptSnapshot.trim().length === 0) {
    return { ok: false, status: 422, error: `answers[${index}].promptSnapshot is required.` };
  }
  if (typeof raw.value !== "string") {
    return { ok: false, status: 422, error: `answers[${index}].value must be a string.` };
  }

  return {
    ok: true,
    value: {
      questionKey,
      questionOrder: raw.questionOrder,
      responseType,
      promptSnapshot: raw.promptSnapshot,
      value: raw.value,
    },
  };
}

/** Validate Curriculum Hub submit JSON body (no Airtable I/O). */
export function parseCurriculumSubmitPayload(body: unknown): ValidationResult<CurriculumSubmitPayload> {
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }

  const enrollmentId = typeof body.enrollmentId === "string" ? body.enrollmentId.trim() : "";
  if (!RECORD_ID_RE.test(enrollmentId)) {
    return { ok: false, status: 422, error: "enrollmentId is invalid." };
  }

  const assignmentKey = typeof body.assignmentKey === "string" ? body.assignmentKey.trim() : "";
  if (!ASSIGNMENT_KEY_RE.test(assignmentKey)) {
    return { ok: false, status: 422, error: "assignmentKey is invalid." };
  }

  if (
    typeof body.curriculumVersion !== "number" ||
    !Number.isInteger(body.curriculumVersion) ||
    body.curriculumVersion < 1
  ) {
    return { ok: false, status: 422, error: "curriculumVersion is invalid." };
  }

  if (!isGradeBand(body.gradeBand)) {
    return { ok: false, status: 422, error: "gradeBand is invalid." };
  }

  if (
    typeof body.attemptNumber !== "number" ||
    !Number.isInteger(body.attemptNumber) ||
    body.attemptNumber < 1
  ) {
    return { ok: false, status: 422, error: "attemptNumber is invalid." };
  }

  let parentAttemptNumber: number | null = null;
  if (body.parentAttemptNumber != null) {
    if (
      typeof body.parentAttemptNumber !== "number" ||
      !Number.isInteger(body.parentAttemptNumber) ||
      body.parentAttemptNumber < 1
    ) {
      return { ok: false, status: 422, error: "parentAttemptNumber is invalid." };
    }
    parentAttemptNumber = body.parentAttemptNumber;
  }

  if (typeof body.submittedAt !== "string" || Number.isNaN(Date.parse(body.submittedAt))) {
    return { ok: false, status: 422, error: "submittedAt must be an ISO-8601 datetime." };
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return { ok: false, status: 422, error: "answers must be a non-empty array." };
  }
  if (body.answers.length > 50) {
    return { ok: false, status: 422, error: "answers exceeds the maximum length." };
  }

  const answers: CurriculumSubmitAnswer[] = [];
  for (let i = 0; i < body.answers.length; i += 1) {
    const parsed = parseAnswer(body.answers[i], i);
    if (!parsed.ok) return parsed;
    answers.push(parsed.value);
  }

  if (parentAttemptNumber != null && parentAttemptNumber >= body.attemptNumber) {
    return { ok: false, status: 422, error: "parentAttemptNumber must be less than attemptNumber." };
  }

  return {
    ok: true,
    value: {
      enrollmentId,
      assignmentKey,
      curriculumVersion: body.curriculumVersion,
      gradeBand: body.gradeBand,
      attemptNumber: body.attemptNumber,
      parentAttemptNumber,
      submittedAt: body.submittedAt,
      answers,
    },
  };
}

/** Coach-readable Q/A snapshot for Homework Completions (no XP). */
export function formatCurriculumAnswersSnapshot(answers: CurriculumSubmitAnswer[]): string {
  const sorted = [...answers].sort((a, b) => a.questionOrder - b.questionOrder);
  return sorted
    .map((answer) => {
      const prompt = answer.promptSnapshot.trim();
      const value = answer.value.trim() || "(no response)";
      return `Q${answer.questionOrder}. ${prompt}\nA: ${value}`;
    })
    .join("\n\n");
}

export function buildAttemptKey(input: {
  enrollmentId: string;
  assignmentKey: string;
  attemptNumber: number;
}): string {
  return `${input.enrollmentId}|${input.assignmentKey}|${input.attemptNumber}`;
}

export function buildResponseKey(attemptKey: string, questionKey: string): string {
  return `${attemptKey}|${questionKey}`;
}

export function submissionDateFromIso(submittedAt: string): string {
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid submittedAt");
  }
  return date.toISOString().slice(0, 10);
}

export type HomeworkCompletionWriteFields = {
  Enrollment: string[];
  Homework: string[];
  "Program Homework Assignment"?: string[];
  Week?: string[];
  "Completion Status": "Submitted";
  "Review Status": "Ready for Review";
  "Submission Date": string;
  "Source System": "Curriculum Hub" | "Other";
  "Item Type": "Homework";
  "Curriculum Idempotency Key": string;
  "Assignment Key": string;
  "Curriculum Answers Snapshot": string;
  Notes?: string;
};

/**
 * Map a validated submit payload into HC write fields.
 * Never sets Satisfactory?, Review Complete, Coach Feedback, or XP fields.
 */
export function buildHomeworkCompletionFields(input: {
  enrollmentId: string;
  libraryId: string;
  phaId: string | null;
  weekId: string | null;
  idempotencyKey: string;
  assignmentKey: string;
  submittedAt: string;
  answers: CurriculumSubmitAnswer[];
  notes?: string[];
  sourceSystem?: "Curriculum Hub" | "Other";
}): HomeworkCompletionWriteFields {
  const notes = (input.notes ?? []).filter((line) => line.trim().length > 0);
  const fields: HomeworkCompletionWriteFields = {
    Enrollment: [input.enrollmentId],
    Homework: [input.libraryId],
    "Completion Status": "Submitted",
    "Review Status": "Ready for Review",
    "Submission Date": submissionDateFromIso(input.submittedAt),
    "Source System": input.sourceSystem ?? "Curriculum Hub",
    "Item Type": "Homework",
    "Curriculum Idempotency Key": input.idempotencyKey,
    "Assignment Key": input.assignmentKey,
    "Curriculum Answers Snapshot": formatCurriculumAnswersSnapshot(input.answers),
  };

  if (input.phaId) {
    fields["Program Homework Assignment"] = [input.phaId];
  }
  if (input.weekId) {
    fields.Week = [input.weekId];
  }
  if (notes.length > 0) {
    fields.Notes = notes.join("\n");
  }

  return fields;
}

/** Forbidden HC fields — must never appear on Curriculum Hub writes. */
export const FORBIDDEN_HC_WRITE_FIELDS = [
  "Satisfactory?",
  "Review Complete",
  "Coach Feedback",
  "Base XP Awarded",
  "Extra Credit XP Awarded",
  "XP Events",
] as const;

export function assertNoForbiddenHcFields(fields: Record<string, unknown>): void {
  for (const key of FORBIDDEN_HC_WRITE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      throw new Error(`Forbidden Homework Completions field in write: ${key}`);
    }
  }
}

export function expectedAttemptNumber(input: {
  existingMaxAttempt: number;
  isNeedsRevision: boolean;
  isNewCompletion: boolean;
}): number {
  if (input.isNewCompletion || input.existingMaxAttempt < 1) {
    return 1;
  }
  if (input.isNeedsRevision) {
    return input.existingMaxAttempt + 1;
  }
  return input.existingMaxAttempt;
}
