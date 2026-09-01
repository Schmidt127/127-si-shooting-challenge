import { listAirtableRecords } from "@/lib/airtable/client";
import {
  classifyHomeworkLoadError,
  HomeworkLoadError,
} from "@/lib/airtable/homework-load-errors";
import { loadActivePhaSchedule } from "@/lib/airtable/pha-repository";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { resolveRegisteringShootingChallengeProgramInstance } from "@/lib/airtable/registering-program-instance";
import { asText, firstLinkedRecordId, linkedRecordIds } from "@/lib/data/airtable-values";
import {
  applyGradeBandLabelsToPhaRows,
  buildHomeworkCatalog,
  buildWeekMetaIndex,
  mapCurriculumToAssignment,
  type FbcCurriculumFields,
  type ProgramHomeworkAssignmentScheduleFields,
  type WeekFields,
} from "@/lib/data/homework";
import {
  createCorrelationId,
  logPublicLoad,
} from "@/lib/observability/public-load-log";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";

const REVALIDATE_SECONDS = 300;

const TABLES = {
  programHomeworkAssignments: PUBLIC_AIRTABLE_TABLES.programHomeworkAssignments.name,
  homeworkLibrary: PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name,
  weeks: PUBLIC_AIRTABLE_TABLES.weeks.name,
  gradeBands: PUBLIC_AIRTABLE_TABLES.gradeBands.name,
} as const;

const CURRICULUM_CATALOG_FIELDS = [
  "Assignment Full Name",
  "Assignment Full Name - Display",
  "Assignment Title",
  "Brief Description - Display",
  "Homework Number",
  "Assignment Number",
  "Order",
  "Book",
  "Book Abbreviation",
  "Assignment Topic",
  "Cover Images",
  "Docs",
  "URL",
  "URL Additional",
  "Published?",
  "Submissions",
] as const;

const CURRICULUM_DETAIL_FIELDS = [
  ...CURRICULUM_CATALOG_FIELDS,
  "Full Assignment Description",
  "Assignment Description",
  "Specific Steps",
  "Assignment Rationale",
  "Age Appropriate",
  "Docs",
  "URL",
  "URL Additional",
] as const;

const WEEK_FIELDS = ["Week Name", "Start Date", "End Date"] as const;
const GRADE_BAND_FIELDS = ["Grade Band Name"] as const;

type GradeBandFields = {
  "Grade Band Name"?: unknown;
};

export type HomeworkCatalogLoadResult =
  | { status: "success"; data: HomeworkCatalogData; correlationId: string }
  | { status: "empty"; data: HomeworkCatalogData; correlationId: string }
  | { status: "error"; error: HomeworkLoadError; correlationId: string };

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

async function listWeeksByIds(ids: string[]): Promise<Array<{ id: string; fields: WeekFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<WeekFields>({
    tableName: TABLES.weeks,
    maxRecords: ids.length,
    fields: [...WEEK_FIELDS],
    filterByFormula: recordIdFormula(ids),
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

async function listCurriculumByIds(
  ids: string[],
  detail = false,
): Promise<Array<{ id: string; fields: FbcCurriculumFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<FbcCurriculumFields>({
    tableName: TABLES.homeworkLibrary,
    maxRecords: ids.length,
    fields: detail ? [...CURRICULUM_DETAIL_FIELDS] : [...CURRICULUM_CATALOG_FIELDS],
    filterByFormula: recordIdFormula(ids),
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

async function listGradeBandsByIds(
  ids: string[],
): Promise<Array<{ id: string; fields: GradeBandFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<GradeBandFields>({
    tableName: TABLES.gradeBands,
    maxRecords: ids.length,
    fields: [...GRADE_BAND_FIELDS],
    filterByFormula: recordIdFormula(ids),
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

export async function loadHomeworkCatalog(): Promise<HomeworkCatalogLoadResult> {
  const correlationId = createCorrelationId();
  const started = Date.now();

  try {
    const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);
    const { parseResult } = await loadActivePhaSchedule({
      programInstance,
      revalidateSeconds: REVALIDATE_SECONDS,
      correlationId,
      operation: "homework.loadCatalog",
    });

    if (parseResult.duplicateSlotKeys.length > 0) {
      throw new HomeworkLoadError({
        category: "schedule_integrity",
        correlationId,
        message: `Multiple active PHA rows exist for ${parseResult.duplicateSlotKeys.join(", ")}; public homework fails closed.`,
        retryable: false,
      });
    }

    if (parseResult.rows.length === 0) {
      const empty: HomeworkCatalogData = {
        weekGroups: [],
        totalAssignments: 0,
        updatedAt: new Date().toISOString(),
      };
      logPublicLoad({
        correlationId,
        operation: "homework.loadCatalog",
        level: "info",
        category: "homework_empty",
        durationMs: Date.now() - started,
      });
      return { status: "empty", data: empty, correlationId };
    }

    const gradeBandIds = [...new Set(parseResult.rows.flatMap((row) => row.gradeBandIds))];
    const gradeBandRecords = await listGradeBandsByIds(gradeBandIds);
    const gradeBandNamesById = new Map(
      gradeBandRecords.map((record) => [record.id, asText(record.fields["Grade Band Name"], "")]),
    );
    const labeledPhaRows = applyGradeBandLabelsToPhaRows(parseResult.rows, gradeBandNamesById);

    const homeworkIds = [...new Set(labeledPhaRows.map((row) => row.homeworkId))];
    const weekIds = [...new Set(labeledPhaRows.map((row) => row.weekId))];
    const [curriculumRecords, weekRecords] = await Promise.all([
      listCurriculumByIds(homeworkIds),
      listWeeksByIds(weekIds),
    ]);

    const curriculumById = new Map(curriculumRecords.map((record) => [record.id, record]));
    const missingLibraryIds = homeworkIds.filter((id) => !curriculumById.has(id));
    if (missingLibraryIds.length > 0) {
      throw new HomeworkLoadError({
        category: "missing_library",
        correlationId,
        message: `Active PHA references missing Homework Library record(s) ${missingLibraryIds.join(", ")}; public homework fails closed.`,
        retryable: false,
      });
    }

    const data = buildHomeworkCatalog(curriculumRecords, weekRecords, labeledPhaRows);
    logPublicLoad({
      correlationId,
      operation: "homework.loadCatalog",
      level: "info",
      category: "homework_success",
      durationMs: Date.now() - started,
      safeDetail: {
        totalAssignments: data.totalAssignments,
        weekGroups: data.weekGroups.length,
      },
    });

    return { status: "success", data, correlationId };
  } catch (error) {
    const classified = classifyHomeworkLoadError(error, correlationId);
    logPublicLoad({
      correlationId,
      operation: "homework.loadCatalog",
      level: "error",
      category: classified.category,
      durationMs: Date.now() - started,
    });
    return { status: "error", error: classified, correlationId };
  }
}

export async function fetchScheduledHomeworkCatalog(): Promise<HomeworkCatalogData> {
  const result = await loadHomeworkCatalog();
  if (result.status === "error") throw result.error;
  return result.data;
}

export async function listCurrentPhaRecords(): Promise<
  Array<{ id: string; fields: ProgramHomeworkAssignmentScheduleFields }>
> {
  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);
  const { records } = await loadActivePhaSchedule({
    programInstance,
    revalidateSeconds: REVALIDATE_SECONDS,
    operation: "homework.listCurrentPhaRecords",
  });
  return records;
}

export async function fetchScheduledHomeworkAssignment(recordId: string): Promise<HomeworkAssignment | null> {
  if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId)) return null;

  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);
  const { parseResult } = await loadActivePhaSchedule({
    programInstance,
    revalidateSeconds: REVALIDATE_SECONDS,
    operation: "homework.loadAssignment",
  });

  if (parseResult.duplicateSlotKeys.length > 0) {
    throw new HomeworkLoadError({
      category: "schedule_integrity",
      correlationId: createCorrelationId(),
      message: `Multiple active PHA rows exist for ${parseResult.duplicateSlotKeys.join(", ")}; public homework fails closed.`,
      retryable: false,
    });
  }

  const matchingRows = parseResult.rows.filter((row) => row.homeworkId === recordId);
  if (matchingRows.length === 0) return null;

  const distinctWeekIds = [...new Set(matchingRows.map((row) => row.weekId))];
  if (distinctWeekIds.length !== 1) {
    throw new HomeworkLoadError({
      category: "schedule_integrity",
      correlationId: createCorrelationId(),
      message: `Homework ${recordId} is scheduled to ${distinctWeekIds.length} distinct Weeks; public detail is ambiguous.`,
      retryable: false,
    });
  }

  const phaRow = matchingRows[0];
  const gradeBandRecords = await listGradeBandsByIds(phaRow.gradeBandIds);
  const labeledPhaRow = applyGradeBandLabelsToPhaRows(
    [phaRow],
    new Map(gradeBandRecords.map((record) => [record.id, asText(record.fields["Grade Band Name"], "")])),
  )[0];
  const [curriculumRecords, weekRecords] = await Promise.all([
    listCurriculumByIds([recordId], true),
    listWeeksByIds(distinctWeekIds),
  ]);
  const curriculum = curriculumRecords[0];
  if (!curriculum) return null;

  const weekIndex = buildWeekMetaIndex(weekRecords);
  return mapCurriculumToAssignment(curriculum, weekIndex, labeledPhaRow);
}

/** @deprecated Prefer firstLinkedRecordId from airtable-values; retained for local call sites. */
export const firstLinkedId = firstLinkedRecordId;

/** @deprecated Prefer linkedRecordIds from airtable-values. */
export function getPhaHomeworkIds(
  phaRecords: Array<{ fields: ProgramHomeworkAssignmentScheduleFields }>,
): string[] {
  return [
    ...new Set(
      phaRecords
        .flatMap((pha) => linkedRecordIds(pha.fields["Homework Assignment"]))
        .filter(Boolean),
    ),
  ];
}

/** Catalog sort field documented for operators — Homework Library `Order`, descending within each week. */
export const HOMEWORK_CATALOG_SORT_FIELD = "Order";
export const HOMEWORK_CATALOG_SORT_DIRECTION = "desc";
