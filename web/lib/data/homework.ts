import type {
  HomeworkAssignment,
  HomeworkAttachment,
  HomeworkCatalogData,
  HomeworkWeekGroup,
} from "@/types/homework";

import {
  asNumber,
  asOptionalDateKey,
  asText,
  asUrl,
  firstLinkedRecordId,
  linkedRecordIds,
  selectName,
  selectNames,
} from "./airtable-values";

export type FbcCurriculumFields = {
  "Assignment Full Name"?: unknown;
  "Assignment Full Name - Display"?: unknown;
  "Assignment Title"?: unknown;
  "Brief Description - Display"?: unknown;
  "Full Assignment Description"?: unknown;
  "Assignment Description"?: unknown;
  "Specific Steps"?: unknown;
  "Assignment Rationale"?: unknown;
  Week?: unknown;
  "Homework Number"?: unknown;
  "Assignment Number"?: unknown;
  Order?: unknown;
  Book?: unknown;
  "Book Abbreviation"?: unknown;
  "Assignment Topic"?: unknown;
  "Age Appropriate"?: unknown;
  "Cover Images"?: unknown;
  Docs?: unknown;
  URL?: unknown;
  "URL Additional"?: unknown;
  "Grade Band"?: unknown;
  "Published?"?: unknown;
  Submissions?: unknown;
};

export type ProgramHomeworkAssignmentScheduleFields = {
  "Homework Assignment"?: unknown;
  "Program Instance"?: unknown;
  Week?: unknown;
  "Grade Band"?: unknown;
  "Homework Slot"?: unknown;
  "Active?"?: unknown;
  "Due Date"?: unknown;
  "Operator Notes"?: unknown;
};

export type ScheduledPhaRow = {
  phaId: string;
  homeworkId: string;
  weekId: string;
  programInstanceId: string;
  homeworkSlot: string;
  /** Display labels resolved from Grade Bands (e.g. K-2, 3-4). */
  gradeBands: string[];
  gradeBandIds: string[];
  dueDate: string | null;
  operatorNotes: string | null;
};

export type WeekMeta = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  weekNumber: number;
};

export type WeekFields = {
  "Week Name"?: unknown;
  "Start Date"?: unknown;
  "End Date"?: unknown;
};

type RawAttachment = {
  id?: string;
  url?: string;
  filename?: string;
};

export function parseWeekNumber(weekName: string): number {
  const match = weekName.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** @deprecated Prefer firstLinkedRecordId from airtable-values. */
export function getFirstLinkedId(value: unknown): string {
  return firstLinkedRecordId(value);
}

export function homeworkSlotOrder(slot: string): number {
  if (slot === "HW1") return 1;
  if (slot === "HW2") return 2;
  return 99;
}

export function resolveSubmissionRequirement(
  homeworkSlot: string,
  librarySubmissionsHint: string,
): string | null {
  const hint = librarySubmissionsHint.trim();
  if (hint) return hint;

  switch (homeworkSlot) {
    case "HW1":
      return "Submit through the daily form Homework 1 field (photo, written response, or activity upload as described).";
    case "HW2":
      return "Submit through the daily form Homework 2 field (often a short video or written response).";
    default:
      return homeworkSlot ? `Submit through the daily form (${homeworkSlot}).` : null;
  }
}

export function resolveInstructionsPreview(briefDescription: string): string {
  const trimmed = briefDescription.trim();
  return trimmed || "Instructions coming soon.";
}

export function resolveAssignmentDueDateKey(
  phaDueDate: unknown,
  weekMeta: WeekMeta | undefined,
): string | null {
  return asOptionalDateKey(phaDueDate) ?? weekMeta?.endDate ?? null;
}

/**
 * Parse active PHA rows for the public catalog. Incomplete rows are skipped;
 * duplicate active PI+Week+slot collisions are returned for fail-closed handling.
 */
export function parseActivePhaScheduleRows(
  phaRecords: Array<{ id: string; fields: ProgramHomeworkAssignmentScheduleFields }>,
  programInstanceId: string,
): { rows: ScheduledPhaRow[]; skippedIncomplete: number; duplicateSlotKeys: string[] } {
  const rows: ScheduledPhaRow[] = [];
  const slots = new Map<string, string>();
  const duplicateSlotKeys: string[] = [];
  let skippedIncomplete = 0;

  for (const pha of phaRecords) {
    if (pha.fields["Active?"] !== true) continue;

    const homeworkIds = linkedRecordIds(pha.fields["Homework Assignment"]);
    const weekIds = linkedRecordIds(pha.fields.Week);
    const programInstanceIds = linkedRecordIds(pha.fields["Program Instance"]);
    const slot = selectName(pha.fields["Homework Slot"], "");

    if (
      homeworkIds.length !== 1 ||
      weekIds.length !== 1 ||
      programInstanceIds.length !== 1 ||
      !slot
    ) {
      skippedIncomplete += 1;
      continue;
    }

    if (programInstanceIds[0] !== programInstanceId) continue;

    const slotKey = `${programInstanceIds[0]}|${weekIds[0]}|${slot}`;
    const prior = slots.get(slotKey);
    if (prior && prior !== pha.id) {
      if (!duplicateSlotKeys.includes(slotKey)) duplicateSlotKeys.push(slotKey);
      continue;
    }
    slots.set(slotKey, pha.id);

    rows.push({
      phaId: pha.id,
      homeworkId: homeworkIds[0],
      weekId: weekIds[0],
      programInstanceId: programInstanceIds[0],
      homeworkSlot: slot,
      gradeBandIds: linkedRecordIds(pha.fields["Grade Band"]),
      gradeBands: [],
      dueDate: asOptionalDateKey(pha.fields["Due Date"]),
      operatorNotes: asText(pha.fields["Operator Notes"], "").trim() || null,
    });
  }

  return { rows, skippedIncomplete, duplicateSlotKeys };
}

export function applyGradeBandLabelsToPhaRows(
  rows: ScheduledPhaRow[],
  namesById: Map<string, string>,
): ScheduledPhaRow[] {
  return rows.map((row) => ({
    ...row,
    gradeBands: row.gradeBandIds
      .map((id) => namesById.get(id))
      .filter((name): name is string => Boolean(name)),
  }));
}

export function mapAttachments(value: unknown): HomeworkAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const raw = item as RawAttachment;
      if (!raw.url) return null;
      return {
        id: raw.id ?? raw.url,
        url: raw.url,
        filename: raw.filename ?? "Download",
      };
    })
    .filter((item): item is HomeworkAttachment => item !== null);
}

/** @deprecated Prefer selectNames from airtable-values. */
export function mapSelectOptions(value: unknown): string[] {
  return selectNames(value);
}

export function mapCurriculumToAssignment(
  record: { id: string; fields: FbcCurriculumFields },
  weekIndex: Map<string, WeekMeta>,
  phaRow?: ScheduledPhaRow,
): HomeworkAssignment {
  const fields = record.fields;
  const weekId = phaRow?.weekId ?? getFirstLinkedId(fields.Week);
  const weekMeta = weekIndex.get(weekId);
  const weekName = weekMeta?.name ?? "Unassigned Week";
  const coverImages = mapAttachments(fields["Cover Images"]);
  const briefDescription = asText(fields["Brief Description - Display"], "");
  const submissionsHint = asText(fields.Submissions, "");

  return {
    id: record.id,
    phaId: phaRow?.phaId ?? "",
    title: asText(fields["Assignment Title"], asText(fields["Assignment Full Name"], "Homework")),
    displayName: asText(
      fields["Assignment Full Name - Display"],
      asText(fields["Assignment Full Name"], "Homework Assignment"),
    ),
    briefDescription,
    instructionsPreview: resolveInstructionsPreview(briefDescription),
    weekId,
    weekName,
    weekNumber: weekMeta?.weekNumber ?? parseWeekNumber(weekName),
    weekStartDate: weekMeta?.startDate ?? null,
    weekEndDate: weekMeta?.endDate ?? null,
    homeworkNumber: asText(fields["Homework Number"], ""),
    assignmentNumber: asNumber(fields["Assignment Number"]),
    order: asNumber(fields.Order),
    homeworkSlot: phaRow?.homeworkSlot ?? "",
    dueDate: phaRow
      ? resolveAssignmentDueDateKey(phaRow.dueDate, weekMeta)
      : weekMeta?.endDate ?? null,
    gradeBands: phaRow?.gradeBands ?? [],
    submissionRequirement: phaRow
      ? resolveSubmissionRequirement(phaRow.homeworkSlot, submissionsHint)
      : resolveSubmissionRequirement("", submissionsHint),
    operatorNotes: phaRow?.operatorNotes ?? null,
    book: asText(fields.Book, ""),
    bookAbbreviation: asText(fields["Book Abbreviation"], ""),
    topics: mapSelectOptions(fields["Assignment Topic"]),
    coverImage: coverImages[0] ?? null,
    url: asUrl(fields.URL),
    urlAdditional: asUrl(fields["URL Additional"]),
    gradeBandLabel: asText(fields["Grade Band"], ""),
    fullDescription: asText(fields["Full Assignment Description"], ""),
    assignmentDescription: asText(fields["Assignment Description"], ""),
    specificSteps: asText(fields["Specific Steps"], ""),
    assignmentRationale: asText(fields["Assignment Rationale"], ""),
    ageAppropriate: mapSelectOptions(fields["Age Appropriate"]),
    docs: mapAttachments(fields.Docs),
  };
}

function compareAssignments(a: HomeworkAssignment, b: HomeworkAssignment): number {
  // Reverse assignment order: later / higher Homework Library `Order` first.
  const orderDiff = b.order - a.order;
  if (orderDiff !== 0) return orderDiff;

  const slotDiff = homeworkSlotOrder(b.homeworkSlot) - homeworkSlotOrder(a.homeworkSlot);
  if (slotDiff !== 0) return slotDiff;

  const assignmentDiff = b.assignmentNumber - a.assignmentNumber;
  if (assignmentDiff !== 0) return assignmentDiff;

  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
}

function compareWeekGroups(a: HomeworkWeekGroup, b: HomeworkWeekGroup): number {
  if (a.weekNumber !== b.weekNumber) return b.weekNumber - a.weekNumber;

  const aTime = a.weekStartDate ? Date.parse(a.weekStartDate) : 0;
  const bTime = b.weekStartDate ? Date.parse(b.weekStartDate) : 0;
  if (aTime !== bTime) return bTime - aTime;

  return b.weekName.localeCompare(a.weekName, undefined, { sensitivity: "base" });
}

export function groupAssignmentsByWeek(assignments: HomeworkAssignment[]): HomeworkWeekGroup[] {
  const byWeek = new Map<string, HomeworkWeekGroup>();

  for (const assignment of assignments) {
    const key = assignment.weekId || `unassigned-${assignment.weekName}`;
    const existing = byWeek.get(key);

    if (existing) {
      existing.assignments.push(assignment);
      continue;
    }

    byWeek.set(key, {
      weekId: assignment.weekId,
      weekName: assignment.weekName,
      weekNumber: assignment.weekNumber,
      weekStartDate: assignment.weekStartDate,
      assignments: [assignment],
    });
  }

  const groups = [...byWeek.values()];
  for (const group of groups) {
    group.assignments.sort(compareAssignments);
  }
  groups.sort(compareWeekGroups);

  return groups;
}

export function buildWeekMetaIndex(
  weekRecords: Array<{ id: string; fields: WeekFields }>,
): Map<string, WeekMeta> {
  const index = new Map<string, WeekMeta>();
  for (const week of weekRecords) {
    const name = asText(week.fields["Week Name"], "Week");
    index.set(week.id, {
      name,
      startDate: asOptionalDateKey(week.fields["Start Date"]),
      endDate: asOptionalDateKey(week.fields["End Date"]),
      weekNumber: parseWeekNumber(name),
    });
  }
  return index;
}

export function buildHomeworkCatalog(
  curriculumRecords: Array<{ id: string; fields: FbcCurriculumFields }>,
  weekRecords: Array<{ id: string; fields: WeekFields }>,
  phaRows: ScheduledPhaRow[] = [],
): HomeworkCatalogData {
  const weekIndex = buildWeekMetaIndex(weekRecords);

  if (phaRows.length > 0) {
    const curriculumById = new Map(curriculumRecords.map((record) => [record.id, record]));
    const scheduledAssignments: HomeworkAssignment[] = [];

    for (const phaRow of phaRows) {
      const curriculum = curriculumById.get(phaRow.homeworkId);
      if (!curriculum) continue;
      scheduledAssignments.push(
        mapCurriculumToAssignment(curriculum, weekIndex, phaRow),
      );
    }

    return {
      weekGroups: groupAssignmentsByWeek(scheduledAssignments),
      totalAssignments: scheduledAssignments.length,
      updatedAt: new Date().toISOString(),
    };
  }

  const assignments = curriculumRecords.map((record) =>
    mapCurriculumToAssignment(record, weekIndex),
  );

  return {
    weekGroups: groupAssignmentsByWeek(assignments),
    totalAssignments: assignments.length,
    updatedAt: new Date().toISOString(),
  };
}
