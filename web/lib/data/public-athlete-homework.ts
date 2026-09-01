/**
 * Map active Program Homework Assignments + Homework Completions → public profile rows.
 * Scope: Registering Shooting Challenge PI (2026–2027), Active PHA only, athlete grade band.
 */

import {
  asNumber,
  asOptionalDateKey,
  asText,
  asUrl,
  firstLinkedRecordId,
  linkedRecordIds,
  lookupItems,
  selectName,
} from "@/lib/data/airtable-values";
import { challengeTodayDateKey } from "@/lib/data/public-athlete-profile";
import { parseWeekNumber, resolvePublicAssignmentName } from "@/lib/data/homework";
import type {
  PublicHomeworkAssignment,
  PublicHomeworkCompletionStatus,
} from "@/types/public-athlete-profile";

export type PublicPhaFields = {
  "Homework Assignment"?: unknown;
  Week?: unknown;
  "Grade Band"?: unknown;
  "Homework Slot"?: unknown;
  "Active?"?: unknown;
  "Due Date"?: unknown;
};

export type PublicHomeworkLibraryFields = {
  "Assignment Full Name"?: unknown;
  "Assignment Full Name - Display"?: unknown;
  "Assignment Title"?: unknown;
  "Brief Description - Display"?: unknown;
  "Homework Number"?: unknown;
  "Assignment Number"?: unknown;
  Order?: unknown;
};

export type PublicHomeworkWeekFields = {
  "Week Name"?: unknown;
  "Start Date"?: unknown;
  "End Date"?: unknown;
};

export type PublicHomeworkCompletionFields = {
  "Program Homework Assignment"?: unknown;
  "Completion Status"?: unknown;
  "Satisfactory?"?: unknown;
  "Base XP Awarded"?: unknown;
  "Extra Credit XP Awarded"?: unknown;
  "Coach Feedback"?: unknown;
  "Submission Date"?: unknown;
  "Submission Asset: Reviewer File URL (lookup)"?: unknown;
};

const LAMBDA_REVIEWER_URL_RE =
  /^https:\/\/[^/]+\.lambda-url\.us-east-2\.on\.aws\/file\/rec[a-zA-Z0-9]{14}(?:\?token=[^&]+)?$/;

type WeekMeta = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  weekNumber: number;
};

type SortableHomeworkRow = PublicHomeworkAssignment & {
  sortWeekStart: string | null;
  sortSlot: number;
  sortOrder: number;
  sortAssignmentNumber: number;
};

export function resolveAssignmentDisplayName(fields: PublicHomeworkLibraryFields): string {
  return resolvePublicAssignmentName(fields);
}

export function resolveAssignmentDescription(fields: PublicHomeworkLibraryFields): string | null {
  const description = asText(fields["Brief Description - Display"], "").trim();
  return description || null;
}

/** First safe parent-facing reviewer URL from Homework Completion lookup values. */
export function resolveViewSubmittedHomeworkHref(reviewerUrls: unknown): string | null {
  for (const item of lookupItems(reviewerUrls)) {
    const url = asUrl(item);
    if (url && LAMBDA_REVIEWER_URL_RE.test(url)) return url;
  }
  return null;
}

export function phaMatchesEnrollmentGradeBand(
  phaGradeBandIds: string[],
  enrollmentGradeBandId: string | null,
): boolean {
  if (!enrollmentGradeBandId) return true;
  if (phaGradeBandIds.length === 0) return false;
  return phaGradeBandIds.includes(enrollmentGradeBandId);
}

export function mapCompletionStatus(raw: unknown): PublicHomeworkCompletionStatus {
  const status = selectName(raw, "Not Submitted");
  switch (status) {
    case "Submitted":
      return "submitted";
    case "Under Review":
      return "under_review";
    case "Satisfactory":
      return "approved";
    case "Needs Revision":
      return "needs_revision";
    case "Not Accepted":
      return "not_accepted";
    default:
      return "not_started";
  }
}

export function completionStatusLabel(status: PublicHomeworkCompletionStatus): string {
  switch (status) {
    case "approved":
      return "Satisfactory";
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "needs_revision":
      return "Needs revision";
    case "not_accepted":
      return "Not accepted";
    default:
      return "Not submitted";
  }
}

function homeworkSlotOrder(slot: string): number {
  if (slot === "HW1") return 1;
  if (slot === "HW2") return 2;
  return 99;
}

/** Resolve due date: explicit PHA Due Date when present, else Week End Date. */
export function resolveAssignmentDueDateKey(
  phaFields: PublicPhaFields,
  weekMeta: WeekMeta | undefined,
): string | null {
  return asOptionalDateKey(phaFields["Due Date"]) ?? weekMeta?.endDate ?? null;
}

export function resolveHomeworkCreditEligibility(input: {
  dueDateKey: string | null;
  submissionDateKey: string | null;
  completionStatus: PublicHomeworkCompletionStatus;
  satisfactory: boolean;
  xpAwarded: number;
  todayKey?: string;
}): Pick<PublicHomeworkAssignment, "creditEligible" | "pastDue" | "lateSubmission"> {
  const todayKey = input.todayKey ?? challengeTodayDateKey();
  const pastDue = Boolean(input.dueDateKey && todayKey > input.dueDateKey);
  const lateSubmission = Boolean(
    input.dueDateKey &&
      input.submissionDateKey &&
      input.submissionDateKey > input.dueDateKey,
  );

  if (input.satisfactory || input.xpAwarded > 0) {
    return { creditEligible: true, pastDue, lateSubmission };
  }

  if (input.completionStatus === "not_accepted") {
    return { creditEligible: false, pastDue, lateSubmission };
  }

  if (lateSubmission) {
    return { creditEligible: false, pastDue, lateSubmission };
  }

  if (pastDue && !input.submissionDateKey) {
    return { creditEligible: false, pastDue, lateSubmission: false };
  }

  return { creditEligible: null, pastDue, lateSubmission: false };
}

function comparePublicHomeworkAssignments(a: SortableHomeworkRow, b: SortableHomeworkRow): number {
  const aStart = a.sortWeekStart ?? "";
  const bStart = b.sortWeekStart ?? "";
  if (aStart !== bStart) return aStart.localeCompare(bStart);

  const slotDiff = a.sortSlot - b.sortSlot;
  if (slotDiff !== 0) return slotDiff;

  const orderDiff = a.sortOrder - b.sortOrder;
  if (orderDiff !== 0) return orderDiff;

  const assignmentDiff = a.sortAssignmentNumber - b.sortAssignmentNumber;
  if (assignmentDiff !== 0) return assignmentDiff;

  return a.assignmentName.localeCompare(b.assignmentName, undefined, { sensitivity: "base" });
}

export function buildPublicHomeworkAssignments(input: {
  phaRecords: Array<{ id: string; fields: PublicPhaFields }>;
  libraryById: Map<string, PublicHomeworkLibraryFields>;
  weekById: Map<string, WeekMeta>;
  completionsByPhaId: Map<string, PublicHomeworkCompletionFields>;
  enrollmentGradeBandId: string | null;
  todayKey?: string;
}): PublicHomeworkAssignment[] {
  const rows: SortableHomeworkRow[] = [];

  for (const pha of input.phaRecords) {
    if (pha.fields["Active?"] !== true) continue;

    const gradeBandIds = linkedRecordIds(pha.fields["Grade Band"]);
    if (!phaMatchesEnrollmentGradeBand(gradeBandIds, input.enrollmentGradeBandId)) {
      continue;
    }

    const homeworkId = firstLinkedRecordId(pha.fields["Homework Assignment"]);
    const weekId = firstLinkedRecordId(pha.fields.Week);
    if (!homeworkId || !weekId) continue;

    const libraryFields = input.libraryById.get(homeworkId) ?? {};
    const weekMeta = input.weekById.get(weekId);
    const completion = input.completionsByPhaId.get(pha.id);

    const completionStatus = mapCompletionStatus(completion?.["Completion Status"]);
    const satisfactory = completion?.["Satisfactory?"] === true;
    const baseXp = asNumber(completion?.["Base XP Awarded"]);
    const extraXp = asNumber(completion?.["Extra Credit XP Awarded"]);
    const xpAwarded =
      completion == null
        ? null
        : Math.max(0, (Number.isFinite(baseXp) ? baseXp : 0) + (Number.isFinite(extraXp) ? extraXp : 0));
    const submissionDate = asOptionalDateKey(completion?.["Submission Date"]);
    const dueDate = resolveAssignmentDueDateKey(pha.fields, weekMeta);
    const credit = resolveHomeworkCreditEligibility({
      dueDateKey: dueDate,
      submissionDateKey: submissionDate,
      completionStatus,
      satisfactory,
      xpAwarded: xpAwarded ?? 0,
      todayKey: input.todayKey,
    });

    const order = asNumber(libraryFields.Order);
    const assignmentNumber = asNumber(libraryFields["Assignment Number"]);
    const slot = selectName(pha.fields["Homework Slot"], "");

    rows.push({
      key: `pha-${pha.id}`,
      assignmentName: resolveAssignmentDisplayName(libraryFields),
      description: resolveAssignmentDescription(libraryFields),
      weekLabel: weekMeta?.name ?? "Week",
      dueDate,
      completionStatus,
      completionStatusLabel: completionStatusLabel(completionStatus),
      submissionDate,
      xpAwarded,
      coachFeedback: asText(completion?.["Coach Feedback"], "") || null,
      creditEligible: credit.creditEligible,
      pastDue: credit.pastDue,
      lateSubmission: credit.lateSubmission,
      homeworkDetailHref: homeworkId ? `/homework/${homeworkId}` : null,
      viewSubmittedHomeworkHref: resolveViewSubmittedHomeworkHref(
        completion?.["Submission Asset: Reviewer File URL (lookup)"],
      ),
      sortWeekStart: weekMeta?.startDate ?? null,
      sortSlot: homeworkSlotOrder(slot),
      sortOrder: Number.isFinite(order) ? order : 0,
      sortAssignmentNumber: Number.isFinite(assignmentNumber) ? assignmentNumber : 0,
    });
  }

  return rows.sort(comparePublicHomeworkAssignments).map((row) => {
    const {
      sortWeekStart: _sortWeekStart,
      sortSlot: _sortSlot,
      sortOrder: _sortOrder,
      sortAssignmentNumber: _sortAssignmentNumber,
      ...publicRow
    } = row;
    return publicRow;
  });
}

export function buildWeekMetaIndex(
  weekRecords: Array<{ id: string; fields: PublicHomeworkWeekFields }>,
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

export function indexCompletionsByPhaId(
  records: Array<{ fields: PublicHomeworkCompletionFields }>,
): Map<string, PublicHomeworkCompletionFields> {
  const index = new Map<string, PublicHomeworkCompletionFields>();
  for (const record of records) {
    const phaId = firstLinkedRecordId(record.fields["Program Homework Assignment"]);
    if (!phaId) continue;
    index.set(phaId, record.fields);
  }
  return index;
}
