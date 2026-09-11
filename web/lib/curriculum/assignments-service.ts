/**
 * Curriculum Hub → SC: active PHA assignments for an enrollment.
 * Auth is enforced by the route (CURRICULUM_INGRESS_SECRET).
 */

import { listAirtableRecords } from "@/lib/airtable/client";
import { PHA_AIRTABLE_FIELDS } from "@/lib/airtable/pha-field-map";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import {
  asBoolean,
  asOptionalDateKey,
  asText,
  linkedRecordIds,
  selectName,
} from "@/lib/data/airtable-values";
import { parseWeekNumber } from "@/lib/data/homework";
import {
  mapCompletionStatus,
  phaMatchesEnrollmentGradeBand,
  resolveAssignmentDueDateKey,
  type PublicHomeworkCompletionFields,
  type PublicHomeworkLibraryFields,
  type PublicHomeworkWeekFields,
  type PublicPhaFields,
} from "@/lib/data/public-athlete-homework";
import {
  challengeTodayDateKey,
  escapeAirtableString,
} from "@/lib/data/public-athlete-profile";

const TABLES = PUBLIC_AIRTABLE_TABLES;

export type CurriculumHubAssignmentStatus =
  | "available"
  | "submitted"
  | "needs_revision"
  | "completed";

export type CurriculumHubPhaAssignment = {
  assignmentKey: string | null;
  libraryRecordId: string;
  phaRecordId: string;
  weekRecordId: string | null;
  weekLabel: string | null;
  homeworkSlot: string | null;
  suggestedDate: string | null;
  weekStartDate: string | null;
  weekEndDate: string | null;
  isRecommended: boolean;
  completionStatus: CurriculumHubAssignmentStatus;
  coachFeedback: string | null;
  contentMissingReason: string | null;
};

export type CurriculumAssignmentsResult =
  | {
      ok: true;
      enrollmentId: string;
      assignments: CurriculumHubPhaAssignment[];
      emptyReason?: string;
    }
  | { ok: false; status: 404 | 422; error: string };

type EnrollmentFields = {
  "Active?"?: unknown;
  "Program Instance"?: unknown;
  "Grade Band"?: unknown;
  "Homework Completions"?: unknown;
};

type LibraryFields = PublicHomeworkLibraryFields & {
  "Assignment Key"?: unknown;
};

type PhaFields = PublicPhaFields & {
  [K in (typeof PHA_AIRTABLE_FIELDS)[keyof typeof PHA_AIRTABLE_FIELDS]]?: unknown;
};

type HcFields = PublicHomeworkCompletionFields & {
  Homework?: unknown;
  "Coach Feedback"?: unknown;
  "Satisfactory?"?: unknown;
};

function isRecordId(value: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(value);
}

function recordIdFormula(ids: string[]): string {
  const clauses = [...new Set(ids.filter(Boolean))].map(
    (id) => `RECORD_ID()='${escapeAirtableString(id)}'`,
  );
  if (clauses.length === 0) return "FALSE()";
  if (clauses.length === 1) return clauses[0];
  return `OR(${clauses.join(",")})`;
}

function hubStatusFromCompletion(fields: HcFields | undefined): CurriculumHubAssignmentStatus {
  if (!fields) return "available";
  const mapped = mapCompletionStatus(fields["Completion Status"]);
  const satisfactory = fields["Satisfactory?"] === true;
  if (satisfactory || mapped === "approved") return "completed";
  if (mapped === "needs_revision") return "needs_revision";
  if (mapped === "submitted" || mapped === "under_review") return "submitted";
  return "available";
}

export async function listCurriculumAssignmentsForEnrollment(
  enrollmentId: string,
): Promise<CurriculumAssignmentsResult> {
  if (!isRecordId(enrollmentId)) {
    return { ok: false, status: 422, error: "Invalid enrollmentId." };
  }

  const enrollmentResponse = await listAirtableRecords<EnrollmentFields>({
    tableName: TABLES.enrollments.name,
    filterByFormula: `RECORD_ID()='${escapeAirtableString(enrollmentId)}'`,
    fields: ["Active?", "Program Instance", "Grade Band", "Homework Completions"],
    maxRecords: 1,
    revalidateSeconds: 15,
  });
  const enrollment = enrollmentResponse.records[0];
  if (!enrollment) {
    return { ok: false, status: 404, error: "Enrollment not found." };
  }
  if (!asBoolean(enrollment.fields["Active?"])) {
    return { ok: false, status: 404, error: "Enrollment is not active." };
  }

  const programInstanceId = linkedRecordIds(enrollment.fields["Program Instance"])[0] ?? null;
  const enrollmentGradeBandId = linkedRecordIds(enrollment.fields["Grade Band"])[0] ?? null;
  const homeworkCompletionIds = linkedRecordIds(enrollment.fields["Homework Completions"]);

  if (!enrollmentGradeBandId) {
    return {
      ok: false,
      status: 422,
      error: "Enrollment has no Grade Band; structured homework assignments unavailable.",
    };
  }

  if (!programInstanceId) {
    return {
      ok: true,
      enrollmentId,
      assignments: [],
      emptyReason:
        "Enrollment has no Program Instance link, so Program Homework Assignments cannot be resolved.",
    };
  }

  const phaFilter = `AND({${PHA_AIRTABLE_FIELDS.active}}=1,FIND('${escapeAirtableString(programInstanceId)}',ARRAYJOIN({${PHA_AIRTABLE_FIELDS.programInstanceRid}})))`;
  const phaResponse = await listAirtableRecords<PhaFields>({
    tableName: TABLES.programHomeworkAssignments.name,
    filterByFormula: phaFilter,
    fields: [
      PHA_AIRTABLE_FIELDS.homeworkAssignment,
      PHA_AIRTABLE_FIELDS.week,
      PHA_AIRTABLE_FIELDS.gradeBand,
      PHA_AIRTABLE_FIELDS.homeworkSlot,
      PHA_AIRTABLE_FIELDS.active,
      PHA_AIRTABLE_FIELDS.dueDate,
      PHA_AIRTABLE_FIELDS.programInstanceRid,
    ],
    maxRecords: 200,
    revalidateSeconds: 60,
  });

  const matchedPha = phaResponse.records.filter((pha) => {
    if (pha.fields[PHA_AIRTABLE_FIELDS.active] !== true) return false;
    return phaMatchesEnrollmentGradeBand(
      linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.gradeBand]),
      enrollmentGradeBandId,
    );
  });

  const libraryIds = [
    ...new Set(
      matchedPha
        .map((pha) => linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.homeworkAssignment])[0])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const weekIds = [
    ...new Set(
      matchedPha
        .map((pha) => linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.week])[0])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [libraryResponse, weekResponse, completionResponse] = await Promise.all([
    libraryIds.length
      ? listAirtableRecords<LibraryFields>({
          tableName: TABLES.homeworkLibrary.name,
          filterByFormula: recordIdFormula(libraryIds),
          fields: ["Assignment Key", "Assignment Title", "Order"],
          maxRecords: libraryIds.length,
          revalidateSeconds: 300,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: LibraryFields }> }),
    weekIds.length
      ? listAirtableRecords<PublicHomeworkWeekFields>({
          tableName: TABLES.weeks.name,
          filterByFormula: recordIdFormula(weekIds),
          fields: ["Week Name", "Start Date", "End Date"],
          maxRecords: weekIds.length,
          revalidateSeconds: 300,
        })
      : Promise.resolve({
          records: [] as Array<{ id: string; fields: PublicHomeworkWeekFields }>,
        }),
    homeworkCompletionIds.length
      ? listAirtableRecords<HcFields>({
          tableName: TABLES.homeworkCompletions.name,
          filterByFormula: recordIdFormula(homeworkCompletionIds),
          fields: [
            "Program Homework Assignment",
            "Homework",
            "Completion Status",
            "Satisfactory?",
            "Coach Feedback",
          ],
          maxRecords: homeworkCompletionIds.length,
          revalidateSeconds: 10,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: HcFields }> }),
  ]);

  const libraryById = new Map(libraryResponse.records.map((row) => [row.id, row.fields]));
  const weekById = new Map(weekResponse.records.map((row) => [row.id, row.fields]));
  const completionByPhaId = new Map<string, HcFields>();
  for (const row of completionResponse.records) {
    const phaId = linkedRecordIds(row.fields["Program Homework Assignment"])[0];
    if (phaId) completionByPhaId.set(phaId, row.fields);
  }

  const todayKey = challengeTodayDateKey();
  const assignments: CurriculumHubPhaAssignment[] = [];

  for (const pha of matchedPha) {
    const libraryId = linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.homeworkAssignment])[0];
    const weekId = linkedRecordIds(pha.fields[PHA_AIRTABLE_FIELDS.week])[0] ?? null;
    if (!libraryId) continue;

    const library = libraryById.get(libraryId) ?? {};
    const weekFields = weekId ? weekById.get(weekId) : undefined;
    const weekStart = weekFields ? asOptionalDateKey(weekFields["Start Date"]) : null;
    const weekEnd = weekFields ? asOptionalDateKey(weekFields["End Date"]) : null;
    const weekLabel = weekFields ? asText(weekFields["Week Name"], "Week") : null;
    const weekNumber = parseWeekNumber(weekLabel ?? "");

    const dueDate = asOptionalDateKey(pha.fields[PHA_AIRTABLE_FIELDS.dueDate]);
    const suggestedDate =
      dueDate ??
      resolveAssignmentDueDateKey(pha.fields, {
        name: weekLabel ?? "Week",
        startDate: weekStart,
        endDate: weekEnd,
        weekNumber,
      });

    const inWeekWindow = Boolean(
      weekStart && weekEnd && todayKey >= weekStart && todayKey <= weekEnd,
    );
    let inDueWindow = false;
    if (suggestedDate) {
      const todayMs = Date.parse(`${todayKey}T12:00:00.000Z`);
      const dueMs = Date.parse(`${suggestedDate}T12:00:00.000Z`);
      if (Number.isFinite(todayMs) && Number.isFinite(dueMs)) {
        const daysUntilDue = (dueMs - todayMs) / 86400000;
        inDueWindow = daysUntilDue >= 0 && daysUntilDue <= 14;
      }
    }
    // Prefer calendar week; otherwise recommend when due date is within the next 14 days.
    const isRecommended = inWeekWindow || inDueWindow;

    const assignmentKeyRaw = asText(library["Assignment Key"], "").trim();
    const assignmentKey = assignmentKeyRaw.length > 0 ? assignmentKeyRaw : null;
    const completion = completionByPhaId.get(pha.id);
    const homeworkSlot = selectName(pha.fields[PHA_AIRTABLE_FIELDS.homeworkSlot], "") || null;

    assignments.push({
      assignmentKey,
      libraryRecordId: libraryId,
      phaRecordId: pha.id,
      weekRecordId: weekId,
      weekLabel,
      homeworkSlot,
      suggestedDate,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      isRecommended,
      completionStatus: hubStatusFromCompletion(completion),
      coachFeedback: asText(completion?.["Coach Feedback"], "") || null,
      contentMissingReason: assignmentKey
        ? null
        : "Homework Library row is missing Assignment Key; Curriculum cannot match this PHA assignment.",
    });
  }

  assignments.sort((a, b) => {
    const weekCmp = String(a.weekStartDate ?? "").localeCompare(String(b.weekStartDate ?? ""));
    if (weekCmp !== 0) return weekCmp;
    return String(a.homeworkSlot ?? "").localeCompare(String(b.homeworkSlot ?? ""));
  });

  return { ok: true, enrollmentId, assignments };
}
