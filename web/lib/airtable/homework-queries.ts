import { listAirtableRecords } from "@/lib/airtable/client";
import {
  PUBLIC_AIRTABLE_TABLES,
} from "@/lib/airtable/public-tables";
import { resolveRegisteringShootingChallengeProgramInstance } from "@/lib/airtable/registering-program-instance";
import {
  asText,
  firstLinkedRecordId,
  requireExactlyOneLinkedRecordId,
  selectName,
} from "@/lib/data/airtable-values";
import {
  buildHomeworkCatalog,
  mapCurriculumToAssignment,
  type FbcCurriculumFields,
  type WeekFields,
} from "@/lib/data/homework";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";

const REVALIDATE_SECONDS = 300;

const TABLES = {
  programHomeworkAssignments: PUBLIC_AIRTABLE_TABLES.programHomeworkAssignments.name,
  homeworkLibrary: PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name,
  weeks: PUBLIC_AIRTABLE_TABLES.weeks.name,
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

// Grade Band may exist on PHA as eligibility metadata but is not required for schedule identity.
const PHA_FIELDS = [
  "Homework Assignment",
  "Program Instance",
  "Program Instance RID",
  "Week",
  "Grade Band",
  "Homework Slot",
  "Active?",
  "Schedule Key",
] as const;

const WEEK_FIELDS = ["Week Name", "Start Date"] as const;

type ProgramHomeworkAssignmentFields = {
  "Homework Assignment"?: unknown;
  "Program Instance"?: unknown;
  "Program Instance RID"?: unknown;
  Week?: unknown;
  "Grade Band"?: unknown;
  "Homework Slot"?: unknown;
  "Active?"?: unknown;
  "Schedule Key"?: unknown;
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

async function listCurrentPhaRecords(): Promise<Array<{ id: string; fields: ProgramHomeworkAssignmentFields }>> {
  const programInstance = await resolveRegisteringShootingChallengeProgramInstance(REVALIDATE_SECONDS);
  const response = await listAirtableRecords<ProgramHomeworkAssignmentFields>({
    tableName: TABLES.programHomeworkAssignments,
    maxRecords: 500,
    fields: [...PHA_FIELDS],
    filterByFormula: `AND({Active?}=1,FIND('${escapeAirtableString(programInstance.id)}',ARRAYJOIN({Program Instance RID})))`,
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

function buildScheduledPairs(
  phaRecords: Array<{ id: string; fields: ProgramHomeworkAssignmentFields }>,
): Array<{ homeworkId: string; weekId: string }> {
  const pairs = new Map<string, { homeworkId: string; weekId: string }>();
  const slots = new Map<string, string>();

  for (const pha of phaRecords) {
    const label = `Active PHA ${pha.id}`;
    let homeworkId = "";
    let weekId = "";
    let programInstanceId = "";
    try {
      homeworkId = requireExactlyOneLinkedRecordId(
        pha.fields["Homework Assignment"],
        "Homework Assignment",
        label,
      );
      weekId = requireExactlyOneLinkedRecordId(pha.fields.Week, "Week", label);
      programInstanceId = requireExactlyOneLinkedRecordId(
        pha.fields["Program Instance"],
        "Program Instance",
        label,
      );
    } catch {
      throw new Error(`${label} is incomplete; public homework fails closed.`);
    }
    const slot = selectName(pha.fields["Homework Slot"], "");

    if (!homeworkId || !weekId || !programInstanceId || !slot) {
      throw new Error(`${label} is incomplete; public homework fails closed.`);
    }

    // Duplicate active assignments for the same PI+Week+slot are ambiguous even if Grade Band metadata differs.
    const slotKey = `${programInstanceId}|${weekId}|${slot}`;
    const prior = slots.get(slotKey);
    if (prior && prior !== pha.id) {
      throw new Error(`Multiple active PHA rows exist for ${slotKey}; public homework fails closed.`);
    }
    slots.set(slotKey, pha.id);

    const key = `${homeworkId}|${weekId}`;
    if (!pairs.has(key)) pairs.set(key, { homeworkId, weekId });
  }

  return [...pairs.values()];
}

async function listWeeksByIds(ids: string[]): Promise<Array<{ id: string; fields: WeekFields }>> {
  if (ids.length === 0) return [];
  const response = await listAirtableRecords<WeekFields>({
    tableName: TABLES.weeks,
    maxRecords: 100,
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
    maxRecords: 200,
    fields: detail ? [...CURRICULUM_DETAIL_FIELDS] : [...CURRICULUM_CATALOG_FIELDS],
    filterByFormula: `AND({Published?}=1,${recordIdFormula(ids)})`,
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records;
}

export async function fetchScheduledHomeworkCatalog(): Promise<HomeworkCatalogData> {
  const pairs = buildScheduledPairs(await listCurrentPhaRecords());
  if (pairs.length === 0) {
    return { weekGroups: [], totalAssignments: 0, updatedAt: new Date().toISOString() };
  }

  const homeworkIds = [...new Set(pairs.map((pair) => pair.homeworkId))];
  const weekIds = [...new Set(pairs.map((pair) => pair.weekId))];
  const [curriculumRecords, weekRecords] = await Promise.all([
    listCurriculumByIds(homeworkIds),
    listWeeksByIds(weekIds),
  ]);

  const curriculumById = new Map(curriculumRecords.map((record) => [record.id, record]));
  const scheduledCurriculum = pairs.map(({ homeworkId, weekId }) => {
    const curriculum = curriculumById.get(homeworkId);
    if (!curriculum) {
      throw new Error(`Active PHA references unpublished or missing curriculum ${homeworkId}; public homework fails closed.`);
    }
    // Week is injected from PHA for the mapper. It is not read from Homework Library.
    return { id: curriculum.id, fields: { ...curriculum.fields, Week: [weekId] } };
  });

  return buildHomeworkCatalog(scheduledCurriculum, weekRecords);
}

export async function fetchScheduledHomeworkAssignment(recordId: string): Promise<HomeworkAssignment | null> {
  if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId)) return null;
  const pairs = buildScheduledPairs(await listCurrentPhaRecords()).filter((pair) => pair.homeworkId === recordId);
  if (pairs.length === 0) return null;

  const distinctWeekIds = [...new Set(pairs.map((pair) => pair.weekId))];
  if (distinctWeekIds.length !== 1) {
    throw new Error(`Homework ${recordId} is scheduled to ${distinctWeekIds.length} distinct Weeks; public detail is ambiguous.`);
  }

  const [curriculumRecords, weekRecords] = await Promise.all([
    listCurriculumByIds([recordId], true),
    listWeeksByIds(distinctWeekIds),
  ]);
  const curriculum = curriculumRecords[0];
  if (!curriculum) return null;

  const weekIndex = new Map(
    weekRecords.map((week) => [
      week.id,
      {
        name: asText(week.fields["Week Name"], "") || "Week",
        startDate: typeof week.fields["Start Date"] === "string" ? week.fields["Start Date"] : null,
      },
    ]),
  );

  return mapCurriculumToAssignment(
    { id: curriculum.id, fields: { ...curriculum.fields, Week: distinctWeekIds } },
    weekIndex,
  );
}

/** @deprecated Prefer firstLinkedRecordId from airtable-values; retained for local call sites. */
export const firstLinkedId = firstLinkedRecordId;
