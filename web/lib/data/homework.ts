import type {
  HomeworkAssignment,
  HomeworkAttachment,
  HomeworkCatalogData,
  HomeworkWeekGroup,
} from "@/types/homework";

import { asNumber, asText } from "./airtable-values";

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
};

export type WeekFields = {
  "Week Name"?: unknown;
  "Start Date"?: unknown;
};

type AirtableLinkedRecord = { id: string };

type RawAttachment = {
  id?: string;
  url?: string;
  filename?: string;
};

export function parseWeekNumber(weekName: string): number {
  const match = weekName.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function getFirstLinkedId(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const first = value[0];
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null && "id" in first) {
    return String((first as AirtableLinkedRecord).id);
  }
  return "";
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

export function mapSelectOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "object" && value !== null && "name" in value) {
      return [asText((value as { name: unknown }).name, "")].filter(Boolean);
    }
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item !== null && "name" in item) {
        return asText((item as { name: unknown }).name, "");
      }
      return "";
    })
    .filter(Boolean);
}

export function mapCurriculumToAssignment(
  record: { id: string; fields: FbcCurriculumFields },
  weekIndex: Map<string, { name: string; startDate: string | null }>,
): HomeworkAssignment {
  const fields = record.fields;
  const weekId = getFirstLinkedId(fields.Week);
  const weekMeta = weekIndex.get(weekId);
  const weekName = weekMeta?.name ?? "Unassigned Week";
  const coverImages = mapAttachments(fields["Cover Images"]);

  return {
    id: record.id,
    title: asText(fields["Assignment Title"], asText(fields["Assignment Full Name"], "Homework")),
    displayName: asText(
      fields["Assignment Full Name - Display"],
      asText(fields["Assignment Full Name"], "Homework Assignment"),
    ),
    briefDescription: asText(fields["Brief Description - Display"], ""),
    weekId,
    weekName,
    weekNumber: parseWeekNumber(weekName),
    weekStartDate: weekMeta?.startDate ?? null,
    homeworkNumber: asText(fields["Homework Number"], ""),
    assignmentNumber: asNumber(fields["Assignment Number"]),
    order: asNumber(fields.Order),
    book: asText(fields.Book, ""),
    bookAbbreviation: asText(fields["Book Abbreviation"], ""),
    topics: mapSelectOptions(fields["Assignment Topic"]),
    coverImage: coverImages[0] ?? null,
    url: asText(fields.URL, ""),
    urlAdditional: asText(fields["URL Additional"], ""),
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
  const orderDiff = a.order - b.order;
  if (orderDiff !== 0) return orderDiff;

  const assignmentDiff = a.assignmentNumber - b.assignmentNumber;
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

export function buildHomeworkCatalog(
  curriculumRecords: Array<{ id: string; fields: FbcCurriculumFields }>,
  weekRecords: Array<{ id: string; fields: WeekFields }>,
): HomeworkCatalogData {
  const weekIndex = new Map<string, { name: string; startDate: string | null }>();

  for (const week of weekRecords) {
    weekIndex.set(week.id, {
      name: asText(week.fields["Week Name"], "Week"),
      startDate:
        typeof week.fields["Start Date"] === "string" ? week.fields["Start Date"] : null,
    });
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
