import { listAirtableRecords } from "@/lib/airtable/client";
import { listCurrentPhaRecords } from "@/lib/airtable/homework-queries";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { firstLinkedRecordId } from "@/lib/data/airtable-values";
import {
  buildPublicHomeworkAssignments,
  buildWeekMetaIndex,
  indexCompletionsByPhaId,
  type PublicHomeworkCompletionFields,
  type PublicHomeworkLibraryFields,
  type PublicHomeworkWeekFields,
} from "@/lib/data/public-athlete-homework";
import type { PublicHomeworkAssignment } from "@/types/public-athlete-profile";

const REVALIDATE_SECONDS = 120;

const LIBRARY_FIELDS = [
  "Assignment Full Name",
  "Assignment Full Name - Display",
  "Assignment Title",
  "Brief Description - Display",
  "Homework Number",
  "Assignment Number",
  "Order",
] as const;

const WEEK_FIELDS = ["Week Name", "Start Date", "End Date"] as const;

/** Public profile only — never request coach notes or tokenized file URLs. */
const COMPLETION_FIELDS = [
  "Program Homework Assignment",
  "Completion Status",
  "Satisfactory?",
  "Base XP Awarded",
  "Extra Credit XP Awarded",
  "Submission Date",
] as const;

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function recordIdFormula(ids: string[]): string {
  const clauses = [...new Set(ids.filter(Boolean))].map(
    (id) => `RECORD_ID()='${escapeAirtableString(id)}'`,
  );
  if (clauses.length === 0) return "FALSE()";
  if (clauses.length === 1) return clauses[0];
  return `OR(${clauses.join(",")})`;
}

async function listHomeworkCompletionsByIds(
  ids: string[],
): Promise<Array<{ id: string; fields: PublicHomeworkCompletionFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<PublicHomeworkCompletionFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.homeworkCompletions.name,
    maxRecords: ids.length,
    fields: [...COMPLETION_FIELDS],
    filterByFormula: recordIdFormula(ids),
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

async function listLibraryByIds(
  ids: string[],
): Promise<Array<{ id: string; fields: PublicHomeworkLibraryFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<PublicHomeworkLibraryFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name,
    maxRecords: ids.length,
    fields: [...LIBRARY_FIELDS],
    filterByFormula: recordIdFormula(ids),
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

async function listWeeksByIds(
  ids: string[],
): Promise<Array<{ id: string; fields: PublicHomeworkWeekFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<PublicHomeworkWeekFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.weeks.name,
    maxRecords: ids.length,
    fields: [...WEEK_FIELDS],
    filterByFormula: recordIdFormula(ids),
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

/** Load all active PHA-scoped homework rows for one enrollment (no hardcoded count cap). */
export async function fetchPublicAthleteHomeworkAssignments(input: {
  enrollmentGradeBandId: string | null;
  homeworkCompletionIds: string[];
}): Promise<PublicHomeworkAssignment[]> {
  const phaRecords = await listCurrentPhaRecords();
  if (phaRecords.length === 0) return [];

  const homeworkIds = [
    ...new Set(phaRecords.map((pha) => firstLinkedRecordId(pha.fields["Homework Assignment"])).filter(Boolean)),
  ];
  const weekIds = [
    ...new Set(phaRecords.map((pha) => firstLinkedRecordId(pha.fields.Week)).filter(Boolean)),
  ];

  const [libraryRecords, weekRecords, completionRecords] = await Promise.all([
    listLibraryByIds(homeworkIds),
    listWeeksByIds(weekIds),
    listHomeworkCompletionsByIds(input.homeworkCompletionIds),
  ]);

  return buildPublicHomeworkAssignments({
    phaRecords,
    libraryById: new Map(libraryRecords.map((record) => [record.id, record.fields])),
    weekById: buildWeekMetaIndex(weekRecords),
    completionsByPhaId: indexCompletionsByPhaId(completionRecords),
    enrollmentGradeBandId: input.enrollmentGradeBandId,
  });
}

