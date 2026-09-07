import {
  createAirtableRecord,
  createAirtableRecords,
  listAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/client";
import { AirtableApiError } from "@/lib/airtable/errors";
import { PHA_AIRTABLE_FIELDS } from "@/lib/airtable/pha-field-map";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { asBoolean, linkedRecordIds, selectName } from "@/lib/data/airtable-values";
import { escapeAirtableString } from "@/lib/data/public-athlete-profile";
import {
  assertNoForbiddenHcFields,
  buildAttemptKey,
  buildHomeworkCompletionFields,
  buildResponseKey,
  expectedAttemptNumber,
  type CurriculumSubmitPayload,
  type CurriculumSubmitReceipt,
} from "@/lib/curriculum/submit-validation";

const TABLES = PUBLIC_AIRTABLE_TABLES;

type EnrollmentFields = {
  "Active?"?: unknown;
  "Program Instance"?: unknown;
  "Homework Completions"?: unknown;
};

type LibraryFields = {
  "Assignment Key"?: unknown;
};

type HcFields = {
  Enrollment?: unknown;
  Homework?: unknown;
  "Program Homework Assignment"?: unknown;
  Week?: unknown;
  "Completion Status"?: unknown;
  "Curriculum Idempotency Key"?: unknown;
  "Assignment Key"?: unknown;
  Notes?: unknown;
};

type AttemptFields = {
  "Attempt Key"?: unknown;
  "Assignment Key"?: unknown;
  "Attempt Number"?: unknown;
  Status?: unknown;
  "Idempotency Key"?: unknown;
  "Enrollment ID"?: unknown;
  "Homework Completion ID"?: unknown;
};

type PhaFields = {
  [K in (typeof PHA_AIRTABLE_FIELDS)[keyof typeof PHA_AIRTABLE_FIELDS]]?: unknown;
};

export type SubmitServiceResult =
  | { ok: true; receipt: CurriculumSubmitReceipt; idempotent: boolean }
  | { ok: false; status: 404 | 409 | 422 | 503; error: string };

function isRecordId(value: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(value);
}

function logSubmit(event: string, detail: Record<string, string | number | boolean | null>): void {
  // Never include secrets, answer bodies, or prompt text.
  console.info(`[curriculum-submit] ${event}`, detail);
}

async function findEnrollment(enrollmentId: string): Promise<{
  id: string;
  active: boolean;
  programInstanceId: string | null;
  homeworkCompletionIds: string[];
} | null> {
  const response = await listAirtableRecords<EnrollmentFields>({
    tableName: TABLES.enrollments.name,
    filterByFormula: `RECORD_ID()='${escapeAirtableString(enrollmentId)}'`,
    fields: ["Active?", "Program Instance", "Homework Completions"],
    maxRecords: 1,
    revalidateSeconds: 0,
  });
  const record = response.records[0];
  if (!record) return null;
  return {
    id: record.id,
    active: asBoolean(record.fields["Active?"]),
    programInstanceId: linkedRecordIds(record.fields["Program Instance"])[0] ?? null,
    homeworkCompletionIds: linkedRecordIds(record.fields["Homework Completions"]),
  };
}

async function findLibraryByAssignmentKey(assignmentKey: string): Promise<{ id: string } | null> {
  const response = await listAirtableRecords<LibraryFields>({
    tableName: TABLES.homeworkLibrary.name,
    filterByFormula: `{Assignment Key}='${escapeAirtableString(assignmentKey)}'`,
    fields: ["Assignment Key"],
    maxRecords: 2,
    revalidateSeconds: 0,
  });
  if (response.records.length === 0) return null;
  if (response.records.length > 1) {
    throw Object.assign(new Error("Multiple Homework Library rows for Assignment Key"), {
      code: "LIBRARY_AMBIGUOUS" as const,
    });
  }
  return { id: response.records[0].id };
}

async function findPriorByIdempotencyKey(
  idempotencyKey: string,
): Promise<CurriculumSubmitReceipt | null> {
  const attemptResponse = await listAirtableRecords<AttemptFields>({
    tableName: TABLES.homeworkAttempts.name,
    filterByFormula: `{Idempotency Key}='${escapeAirtableString(idempotencyKey)}'`,
    fields: [
      "Attempt Key",
      "Attempt Number",
      "Idempotency Key",
      "Homework Completion ID",
      "Enrollment ID",
    ],
    maxRecords: 2,
    revalidateSeconds: 0,
  });
  const attempt = attemptResponse.records[0];
  if (attempt) {
    const homeworkCompletionId =
      typeof attempt.fields["Homework Completion ID"] === "string"
        ? attempt.fields["Homework Completion ID"].trim()
        : "";
    const attemptNumber =
      typeof attempt.fields["Attempt Number"] === "number" ? attempt.fields["Attempt Number"] : 0;
    if (isRecordId(homeworkCompletionId) && attemptNumber >= 1) {
      return {
        submissionId: attempt.id,
        homeworkCompletionId,
        attemptNumber,
      };
    }
  }

  const hcResponse = await listAirtableRecords<HcFields>({
    tableName: TABLES.homeworkCompletions.name,
    filterByFormula: `{Curriculum Idempotency Key}='${escapeAirtableString(idempotencyKey)}'`,
    fields: ["Curriculum Idempotency Key", "Assignment Key"],
    maxRecords: 2,
    revalidateSeconds: 0,
  });
  const hc = hcResponse.records[0];
  if (!hc) return null;

  const linkedAttempts = await listAirtableRecords<AttemptFields>({
    tableName: TABLES.homeworkAttempts.name,
    filterByFormula: `{Homework Completion ID}='${escapeAirtableString(hc.id)}'`,
    fields: ["Attempt Number", "Idempotency Key", "Homework Completion ID"],
    maxRecords: 50,
    revalidateSeconds: 0,
  });
  const matching = linkedAttempts.records.find(
    (row) => row.fields["Idempotency Key"] === idempotencyKey,
  );
  const attemptNumber =
    typeof matching?.fields["Attempt Number"] === "number"
      ? matching.fields["Attempt Number"]
      : typeof linkedAttempts.records[0]?.fields["Attempt Number"] === "number"
        ? linkedAttempts.records[0].fields["Attempt Number"]
        : 1;

  return {
    submissionId: matching?.id ?? hc.id,
    homeworkCompletionId: hc.id,
    attemptNumber,
  };
}

async function resolvePhaForLibrary(input: {
  libraryId: string;
  programInstanceId: string | null;
}): Promise<
  | { status: "resolved"; phaId: string; weekId: string | null }
  | { status: "unresolved"; reason: string }
  | { status: "ambiguous" }
> {
  if (!input.programInstanceId) {
    return { status: "unresolved", reason: "Enrollment has no Program Instance link." };
  }

  const filterByFormula = `AND({${PHA_AIRTABLE_FIELDS.active}}=1,FIND('${escapeAirtableString(input.programInstanceId)}',ARRAYJOIN({${PHA_AIRTABLE_FIELDS.programInstanceRid}})))`;
  const response = await listAirtableRecords<PhaFields>({
    tableName: TABLES.programHomeworkAssignments.name,
    filterByFormula,
    fields: [
      PHA_AIRTABLE_FIELDS.homeworkAssignment,
      PHA_AIRTABLE_FIELDS.week,
      PHA_AIRTABLE_FIELDS.active,
      PHA_AIRTABLE_FIELDS.programInstanceRid,
    ],
    maxRecords: 8000,
    revalidateSeconds: 0,
  });

  const matches = response.records.filter((record) =>
    linkedRecordIds(record.fields[PHA_AIRTABLE_FIELDS.homeworkAssignment]).includes(input.libraryId),
  );

  if (matches.length === 0) {
    return {
      status: "unresolved",
      reason: "No active Program Homework Assignment for this library + program instance.",
    };
  }
  if (matches.length > 1) {
    return { status: "ambiguous" };
  }

  const pha = matches[0];
  return {
    status: "resolved",
    phaId: pha.id,
    weekId: linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.week])[0] ?? null,
  };
}

async function loadCompletionsByIds(
  ids: string[],
): Promise<Array<{ id: string; fields: HcFields }>> {
  const unique = [...new Set(ids.filter(isRecordId))];
  if (unique.length === 0) return [];

  const records: Array<{ id: string; fields: HcFields }> = [];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const filterByFormula =
      chunk.length === 1
        ? `RECORD_ID()='${escapeAirtableString(chunk[0])}'`
        : `OR(${chunk.map((id) => `RECORD_ID()='${escapeAirtableString(id)}'`).join(",")})`;
    const response = await listAirtableRecords<HcFields>({
      tableName: TABLES.homeworkCompletions.name,
      filterByFormula,
      fields: [
        "Enrollment",
        "Homework",
        "Program Homework Assignment",
        "Week",
        "Completion Status",
        "Curriculum Idempotency Key",
        "Assignment Key",
        "Notes",
      ],
      maxRecords: chunk.length,
      revalidateSeconds: 0,
    });
    records.push(...response.records);
  }
  return records;
}

function pickExistingCompletion(input: {
  completions: Array<{ id: string; fields: HcFields }>;
  libraryId: string;
  phaId: string | null;
}): { status: "none" } | { status: "one"; record: { id: string; fields: HcFields } } | { status: "ambiguous" } {
  const byPha =
    input.phaId == null
      ? []
      : input.completions.filter((row) =>
          linkedRecordIds(row.fields["Program Homework Assignment"]).includes(input.phaId!),
        );
  if (byPha.length === 1) return { status: "one", record: byPha[0] };
  if (byPha.length > 1) return { status: "ambiguous" };

  const byLibrary = input.completions.filter((row) =>
    linkedRecordIds(row.fields.Homework).includes(input.libraryId),
  );
  if (byLibrary.length === 1) return { status: "one", record: byLibrary[0] };
  if (byLibrary.length > 1) return { status: "ambiguous" };
  return { status: "none" };
}

async function listAttemptsForCompletion(homeworkCompletionId: string): Promise<
  Array<{ id: string; fields: AttemptFields }>
> {
  const response = await listAirtableRecords<AttemptFields>({
    tableName: TABLES.homeworkAttempts.name,
    filterByFormula: `{Homework Completion ID}='${escapeAirtableString(homeworkCompletionId)}'`,
    fields: [
      "Attempt Key",
      "Attempt Number",
      "Status",
      "Idempotency Key",
      "Homework Completion ID",
    ],
    maxRecords: 100,
    revalidateSeconds: 0,
  });
  return response.records;
}

async function writeResponses(input: {
  attemptKey: string;
  answers: CurriculumSubmitPayload["answers"];
}): Promise<void> {
  const sorted = [...input.answers].sort((a, b) => a.questionOrder - b.questionOrder);
  for (let i = 0; i < sorted.length; i += 10) {
    const chunk = sorted.slice(i, i + 10);
    await createAirtableRecords({
      tableName: TABLES.homeworkResponses.name,
      records: chunk.map((answer) => ({
        fields: {
          "Response Key": buildResponseKey(input.attemptKey, answer.questionKey),
          "Attempt Key": input.attemptKey,
          "Question Key": answer.questionKey,
          "Question Order": answer.questionOrder,
          "Prompt Snapshot": answer.promptSnapshot,
          "Answer Value": answer.value,
          "Response Type": answer.responseType,
        },
      })),
    });
  }
}

async function createAttemptRecord(input: {
  payload: CurriculumSubmitPayload;
  attemptNumber: number;
  homeworkCompletionId: string;
  idempotencyKey: string;
}): Promise<{ id: string }> {
  const attemptKey = buildAttemptKey({
    enrollmentId: input.payload.enrollmentId,
    assignmentKey: input.payload.assignmentKey,
    attemptNumber: input.attemptNumber,
  });

  const created = await createAirtableRecord({
    tableName: TABLES.homeworkAttempts.name,
    fields: {
      "Attempt Key": attemptKey,
      "Assignment Key": input.payload.assignmentKey,
      "Curriculum Version": input.payload.curriculumVersion,
      "Grade Band Snapshot": input.payload.gradeBand,
      "Attempt Number": input.attemptNumber,
      Status: "Submitted",
      "Submitted At": input.payload.submittedAt,
      "Idempotency Key": input.idempotencyKey,
      "Enrollment ID": input.payload.enrollmentId,
      "Homework Completion ID": input.homeworkCompletionId,
    },
  });

  await writeResponses({ attemptKey, answers: input.payload.answers });
  return { id: created.id };
}

async function supersedePriorAttempts(
  attempts: Array<{ id: string; fields: AttemptFields }>,
  keepAttemptNumber: number,
): Promise<void> {
  for (const attempt of attempts) {
    const number =
      typeof attempt.fields["Attempt Number"] === "number" ? attempt.fields["Attempt Number"] : 0;
    const status = selectName(attempt.fields.Status, "");
    if (number > 0 && number < keepAttemptNumber && status !== "Superseded") {
      await updateAirtableRecord({
        tableName: TABLES.homeworkAttempts.name,
        recordId: attempt.id,
        fields: { Status: "Superseded" },
      });
    }
  }
}

async function writeHomeworkCompletion(input: {
  existingId: string | null;
  fields: ReturnType<typeof buildHomeworkCompletionFields>;
}): Promise<{ id: string; usedFallbackSource: boolean }> {
  const fields = { ...input.fields } as Record<string, unknown>;
  assertNoForbiddenHcFields(fields);

  try {
    if (input.existingId) {
      const updated = await updateAirtableRecord({
        tableName: TABLES.homeworkCompletions.name,
        recordId: input.existingId,
        fields,
        typecast: true,
      });
      return { id: updated.id, usedFallbackSource: false };
    }
    const created = await createAirtableRecord({
      tableName: TABLES.homeworkCompletions.name,
      fields,
      typecast: true,
    });
    return { id: created.id, usedFallbackSource: false };
  } catch (error) {
    if (!(error instanceof AirtableApiError) || input.fields["Source System"] !== "Curriculum Hub") {
      throw error;
    }
    // Prefer Curriculum Hub via typecast; fall back to Other + Notes if choice write fails.
    const fallbackNotes = [
      input.fields.Notes,
      "Source System fallback: Curriculum Hub (typecast write failed; stored as Other).",
    ]
      .filter(Boolean)
      .join("\n");
    const fallbackFields = {
      ...fields,
      "Source System": "Other",
      Notes: fallbackNotes,
    };
    assertNoForbiddenHcFields(fallbackFields);
    if (input.existingId) {
      const updated = await updateAirtableRecord({
        tableName: TABLES.homeworkCompletions.name,
        recordId: input.existingId,
        fields: fallbackFields,
        typecast: true,
      });
      return { id: updated.id, usedFallbackSource: true };
    }
    const created = await createAirtableRecord({
      tableName: TABLES.homeworkCompletions.name,
      fields: fallbackFields,
      typecast: true,
    });
    return { id: created.id, usedFallbackSource: true };
  }
}

/**
 * Process a Curriculum Hub homework submit into SC Airtable.
 * Does not award XP or set Satisfactory? / Review Complete / Coach Feedback.
 */
export async function processCurriculumHomeworkSubmit(input: {
  payload: CurriculumSubmitPayload;
  idempotencyKey: string;
}): Promise<SubmitServiceResult> {
  const { payload, idempotencyKey } = input;

  try {
    const prior = await findPriorByIdempotencyKey(idempotencyKey);
    if (prior) {
      logSubmit("idempotent_hit", {
        enrollmentId: payload.enrollmentId,
        assignmentKey: payload.assignmentKey,
        homeworkCompletionId: prior.homeworkCompletionId,
        attemptNumber: prior.attemptNumber,
      });
      return { ok: true, receipt: prior, idempotent: true };
    }

    const enrollment = await findEnrollment(payload.enrollmentId);
    if (!enrollment) {
      return { ok: false, status: 404, error: "Enrollment not found." };
    }
    if (!enrollment.active) {
      return { ok: false, status: 404, error: "Enrollment is not active." };
    }

    let library: { id: string };
    try {
      const found = await findLibraryByAssignmentKey(payload.assignmentKey);
      if (!found) {
        return { ok: false, status: 404, error: "Homework Library assignment not found." };
      }
      library = found;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "LIBRARY_AMBIGUOUS"
      ) {
        return { ok: false, status: 409, error: "Multiple Homework Library rows match Assignment Key." };
      }
      throw error;
    }

    const phaResult = await resolvePhaForLibrary({
      libraryId: library.id,
      programInstanceId: enrollment.programInstanceId,
    });
    if (phaResult.status === "ambiguous") {
      return {
        ok: false,
        status: 409,
        error: "Multiple Program Homework Assignments match this enrollment and assignment.",
      };
    }

    const phaId = phaResult.status === "resolved" ? phaResult.phaId : null;
    const weekId = phaResult.status === "resolved" ? phaResult.weekId : null;
    const notes: string[] = [];
    if (phaResult.status === "unresolved") {
      notes.push(
        `Curriculum Hub submit: PHA unresolved (${phaResult.reason}). HC created with Enrollment+Homework for correction pipeline.`,
      );
    }

    const completions = await loadCompletionsByIds(enrollment.homeworkCompletionIds);
    const existingPick = pickExistingCompletion({
      completions,
      libraryId: library.id,
      phaId,
    });
    if (existingPick.status === "ambiguous") {
      return {
        ok: false,
        status: 409,
        error: "Multiple Homework Completions match this enrollment and assignment.",
      };
    }

    const existing = existingPick.status === "one" ? existingPick.record : null;
    const completionStatus = existing
      ? selectName(existing.fields["Completion Status"], "")
      : "";
    const isNeedsRevision = completionStatus === "Needs Revision";
    const isNewCompletion = existing == null;

    if (
      existing &&
      !isNeedsRevision &&
      completionStatus !== "" &&
      completionStatus !== "Not Submitted"
    ) {
      return {
        ok: false,
        status: 409,
        error: `Homework Completion already exists with status ${completionStatus}.`,
      };
    }

    const priorAttempts = existing ? await listAttemptsForCompletion(existing.id) : [];
    const existingMaxAttempt = priorAttempts.reduce((max, row) => {
      const n = typeof row.fields["Attempt Number"] === "number" ? row.fields["Attempt Number"] : 0;
      return Math.max(max, n);
    }, 0);

    const attemptNumber = expectedAttemptNumber({
      existingMaxAttempt,
      isNeedsRevision,
      isNewCompletion,
    });

    if (payload.attemptNumber !== attemptNumber) {
      return {
        ok: false,
        status: 422,
        error: `attemptNumber must be ${attemptNumber} for this submission.`,
      };
    }

    if (isNeedsRevision) {
      if (payload.parentAttemptNumber !== existingMaxAttempt) {
        return {
          ok: false,
          status: 422,
          error: `parentAttemptNumber must be ${existingMaxAttempt} for Needs Revision resubmit.`,
        };
      }
    } else if (payload.parentAttemptNumber != null) {
      return {
        ok: false,
        status: 422,
        error: "parentAttemptNumber must be null for the first attempt.",
      };
    }

    const hcFields = buildHomeworkCompletionFields({
      enrollmentId: payload.enrollmentId,
      libraryId: library.id,
      phaId,
      weekId,
      idempotencyKey,
      assignmentKey: payload.assignmentKey,
      submittedAt: payload.submittedAt,
      answers: payload.answers,
      notes,
    });

    const written = await writeHomeworkCompletion({
      existingId: existing?.id ?? null,
      fields: hcFields,
    });

    if (written.usedFallbackSource) {
      logSubmit("source_system_fallback", {
        enrollmentId: payload.enrollmentId,
        assignmentKey: payload.assignmentKey,
        homeworkCompletionId: written.id,
      });
    }

    if (isNeedsRevision && priorAttempts.length > 0) {
      await supersedePriorAttempts(priorAttempts, attemptNumber);
    }

    const attempt = await createAttemptRecord({
      payload,
      attemptNumber,
      homeworkCompletionId: written.id,
      idempotencyKey,
    });

    logSubmit("accepted", {
      enrollmentId: payload.enrollmentId,
      assignmentKey: payload.assignmentKey,
      homeworkCompletionId: written.id,
      attemptNumber,
      phaResolved: phaId != null,
      needsRevision: isNeedsRevision,
    });

    return {
      ok: true,
      idempotent: false,
      receipt: {
        submissionId: attempt.id,
        homeworkCompletionId: written.id,
        attemptNumber,
      },
    };
  } catch (error) {
    if (error instanceof AirtableApiError) {
      logSubmit("airtable_error", {
        enrollmentId: payload.enrollmentId,
        assignmentKey: payload.assignmentKey,
        status: error.status,
      });
      return {
        ok: false,
        status: error.status === 404 ? 404 : 503,
        error: "Homework submit temporarily unavailable.",
      };
    }
    logSubmit("unexpected_error", {
      enrollmentId: payload.enrollmentId,
      assignmentKey: payload.assignmentKey,
    });
    return {
      ok: false,
      status: 503,
      error: "Homework submit temporarily unavailable.",
    };
  }
}
