/**
 * Centralized Airtable field names for Program Homework Assignments (PHA)
 * and Program Instance scoping. UI and route handlers must not hard-code
 * these strings outside this module and `public-tables.ts`.
 */

export const PHA_AIRTABLE_FIELDS = {
  homeworkAssignment: "Homework Assignment",
  programInstance: "Program Instance",
  programInstanceRid: "Program Instance RID",
  week: "Week",
  gradeBand: "Grade Band",
  homeworkSlot: "Homework Slot",
  active: "Active?",
  dueDate: "Due Date",
  operatorNotes: "Operator Notes",
  scheduleKey: "Schedule Key",
  completionsCount: "Completions Count",
} as const;

export const PROGRAM_INSTANCE_AIRTABLE_FIELDS = {
  name: "Name - Program Instance",
  schoolYear: "School Year - Linked",
  program: "Program - Linked",
  status: "Status",
  recordId: "Record Id",
  programHomeworkAssignments: "Program Homework Assignments",
} as const;

export type PhaAirtableFieldName =
  (typeof PHA_AIRTABLE_FIELDS)[keyof typeof PHA_AIRTABLE_FIELDS];
