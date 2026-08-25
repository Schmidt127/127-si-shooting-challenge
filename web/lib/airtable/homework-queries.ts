import { listAirtableRecords } from "@/lib/airtable/client";

import {

  PUBLIC_AIRTABLE_TABLES,

} from "@/lib/airtable/public-tables";

import { resolveRegisteringShootingChallengeProgramInstance } from "@/lib/airtable/registering-program-instance";

import {

  asText,

  firstLinkedRecordId,

  linkedRecordIds,

} from "@/lib/data/airtable-values";

import {

  applyGradeBandLabelsToPhaRows,

  buildHomeworkCatalog,

  buildWeekMetaIndex,

  mapCurriculumToAssignment,

  parseActivePhaScheduleRows,

  type FbcCurriculumFields,

  type ProgramHomeworkAssignmentScheduleFields,

  type WeekFields,

} from "@/lib/data/homework";

import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";



const REVALIDATE_SECONDS = 300;



const TABLES = {

  programHomeworkAssignments: PUBLIC_AIRTABLE_TABLES.programHomeworkAssignments.name,

  homeworkLibrary: PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name,

  weeks: PUBLIC_AIRTABLE_TABLES.weeks.name,

  gradeBands: PUBLIC_AIRTABLE_TABLES.gradeBands.name,

} as const;



// Homework Library is reusable content only. Week/Grade Band are intentionally absent.

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



const PHA_FIELDS = [

  "Homework Assignment",

  "Program Instance",

  "Program Instance RID",

  "Week",

  "Grade Band",

  "Homework Slot",

  "Active?",

  "Due Date",

  "Operator Notes",

  "Schedule Key",

] as const;



const WEEK_FIELDS = ["Week Name", "Start Date", "End Date"] as const;

const GRADE_BAND_FIELDS = ["Grade Band Name"] as const;

type GradeBandFields = {
  "Grade Band Name"?: unknown;
};



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



export async function listCurrentPhaRecords(): Promise<

  Array<{ id: string; fields: ProgramHomeworkAssignmentScheduleFields }>

> {

  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);

  const response = await listAirtableRecords<ProgramHomeworkAssignmentScheduleFields>({

    tableName: TABLES.programHomeworkAssignments,

    maxRecords: 8000,

    fields: [...PHA_FIELDS],

    filterByFormula: `AND({Active?}=1,FIND('${escapeAirtableString(programInstance.id)}',ARRAYJOIN({Program Instance RID})))`,

    revalidateSeconds: REVALIDATE_SECONDS,

  });

  return response.records;

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

    // Active PHA is the public schedule gate. Do not also require Homework Library Published?

    // or a single unpublished library row blocks the entire catalog.

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



export async function fetchScheduledHomeworkCatalog(): Promise<HomeworkCatalogData> {

  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);

  const phaRecords = await listCurrentPhaRecords();

  const { rows: phaRows, duplicateSlotKeys } = parseActivePhaScheduleRows(

    phaRecords,

    programInstance.id,

  );



  if (duplicateSlotKeys.length > 0) {

    throw new Error(

      `Multiple active PHA rows exist for ${duplicateSlotKeys.join(", ")}; public homework fails closed.`,

    );

  }



  if (phaRows.length === 0) {

    return { weekGroups: [], totalAssignments: 0, updatedAt: new Date().toISOString() };

  }



  const gradeBandIds = [...new Set(phaRows.flatMap((row) => row.gradeBandIds))];

  const gradeBandRecords = await listGradeBandsByIds(gradeBandIds);

  const gradeBandNamesById = new Map(

    gradeBandRecords.map((record) => [record.id, asText(record.fields["Grade Band Name"], "")]),

  );

  const labeledPhaRows = applyGradeBandLabelsToPhaRows(phaRows, gradeBandNamesById);



  const homeworkIds = [...new Set(labeledPhaRows.map((row) => row.homeworkId))];

  const weekIds = [...new Set(labeledPhaRows.map((row) => row.weekId))];

  const [curriculumRecords, weekRecords] = await Promise.all([

    listCurriculumByIds(homeworkIds),

    listWeeksByIds(weekIds),

  ]);



  const curriculumById = new Map(curriculumRecords.map((record) => [record.id, record]));

  const missingLibraryIds = homeworkIds.filter((id) => !curriculumById.has(id));

  if (missingLibraryIds.length > 0) {

    throw new Error(

      `Active PHA references missing Homework Library record(s) ${missingLibraryIds.join(", ")}; public homework fails closed.`,

    );

  }



  return buildHomeworkCatalog(curriculumRecords, weekRecords, labeledPhaRows);

}



export async function fetchScheduledHomeworkAssignment(recordId: string): Promise<HomeworkAssignment | null> {

  if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId)) return null;



  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);

  const phaRecords = await listCurrentPhaRecords();

  const { rows: phaRows, duplicateSlotKeys } = parseActivePhaScheduleRows(

    phaRecords,

    programInstance.id,

  );



  if (duplicateSlotKeys.length > 0) {

    throw new Error(

      `Multiple active PHA rows exist for ${duplicateSlotKeys.join(", ")}; public homework fails closed.`,

    );

  }



  const matchingRows = phaRows.filter((row) => row.homeworkId === recordId);

  if (matchingRows.length === 0) return null;



  const distinctWeekIds = [...new Set(matchingRows.map((row) => row.weekId))];

  if (distinctWeekIds.length !== 1) {

    throw new Error(

      `Homework ${recordId} is scheduled to ${distinctWeekIds.length} distinct Weeks; public detail is ambiguous.`,

    );

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


