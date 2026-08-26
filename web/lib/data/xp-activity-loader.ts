/**
 * Enrollment-scoped XP Events loader for athlete dashboards.
 *
 * Authoritative filter: XP Events → Enrollment Record ID (lookup of Enrollments.Record Id).
 * Do NOT use FIND(recordId, ARRAYJOIN({Enrollment})) — ARRAYJOIN on link fields returns
 * display names, not Airtable record IDs (see docs/testing/evidence/.../ENROLLMENT-XP-LINK-INVENTORY.json).
 *
 * Display dates follow automation `toDateKeyFromDateObject` (America/Denver + midnight UTC rule).
 * Submission Base rows use the linked Submission → Activity Date as the authoritative source date.
 */

import { listAirtableRecords } from "@/lib/airtable/client";
import { AirtableApiError } from "@/lib/airtable/errors";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import {
  asBoolean,
  asOptionalNumber,
  asText,
  linkedRecordIds,
  toAirtableDateKey,
} from "@/lib/data/airtable-values";
import { escapeAirtableString } from "@/lib/data/public-athlete-profile";
import type { XpEventSummary } from "@/types/xp";

export const XP_EVENTS_ENROLLMENT_RECORD_ID_FIELD = "Enrollment Record ID";
export const XP_EVENTS_TABLE = PUBLIC_AIRTABLE_TABLES.xpEvents.name;
export const SUBMISSIONS_TABLE = PUBLIC_AIRTABLE_TABLES.submissions.name;

const XP_EVENT_FIELDS = [
  "Active?",
  "Active XP Points",
  "XP Points",
  "XP Reason Public",
  "XP Source",
  "XP Activity Date",
  "Created",
  "Source Key",
  "Duplicate Status",
  "Submission",
  "Homework Completion",
  "Video Feedback",
  XP_EVENTS_ENROLLMENT_RECORD_ID_FIELD,
] as const;

const SUBMISSION_FIELDS = [
  "Activity Date",
  "Created",
  "Count This Submission?",
  "Total Shots Counted",
  "XP Events",
] as const;

const ENROLLMENT_LINK_FIELDS = ["XP Events", "Submissions"] as const;

const LINKED_ID_CHUNK_SIZE = 15;
const DEFAULT_MAX_ROWS = 100;
const DEFAULT_MAX_FETCH = 300;
const REVALIDATE_SECONDS = 60;
const LINKED_IDS_CACHE_TTL_MS = 60_000;
const LINKED_IDS_CACHE_MAX = 50;

const DUPLICATE_REMOVE_STATUS = "Duplicate - Remove";
const SUBMISSION_BASE_SOURCE = "Submission Base";
const SUBMISSION_XP_SOURCE_KEY_PREFIX = "SUBMISSION_XP|";

/**
 * Same-date accomplishment order (lower rank = displayed first).
 * Reverse chronological within a day: latest accomplishments above initiating submission.
 */
const XP_ACCOMPLISHMENT_SORT_RANK: Record<string, number> = {
  "Manual Bonus": 0,
  "Zoom Attendance: Base": 1,
  "Zoom Attendance: Bonus 2": 1,
  "Zoom Attendance: Bonus 3": 1,
  "Zoom Attendance": 1,
  "Zoom Recording": 1,
  "Video Submission": 2,
  "Video Feedback": 2,
  "Homework Completion": 3,
  "7-Day Streak": 4,
  "5-Day Streak": 4,
  Streak: 4,
  "Weekly Threshold 150": 5,
  "Weekly Threshold 125": 5,
  "Weekly Threshold 100": 5,
  "Perfect Week": 5,
  "Shot Milestone": 6,
  [SUBMISSION_BASE_SOURCE]: 7,
  "Shooting Base": 7,
};

export type XpEventRecordFields = {
  "Active?"?: unknown;
  "Active XP Points"?: unknown;
  "XP Points"?: unknown;
  "XP Reason Public"?: unknown;
  "XP Source"?: unknown;
  "XP Activity Date"?: unknown;
  Created?: unknown;
  "Source Key"?: unknown;
  "Duplicate Status"?: unknown;
  Submission?: unknown;
  "Homework Completion"?: unknown;
  "Video Feedback"?: unknown;
  "Enrollment Record ID"?: unknown;
};

export type SubmissionRecordFields = {
  "Activity Date"?: unknown;
  Created?: unknown;
  "Count This Submission?"?: unknown;
  "Total Shots Counted"?: unknown;
  "XP Events"?: unknown;
};

type HomeworkCompletionRecordFields = {
  "Program Homework Assignment"?: unknown;
};

type ProgramHomeworkAssignmentFields = {
  "Homework Assignment"?: unknown;
  "Assignment Title"?: unknown;
};

type HomeworkLibraryTitleFields = {
  "Assignment Title"?: unknown;
};

type VideoFeedbackRecordFields = {
  "Custom Video File Name"?: unknown;
  "Video Asset File Name"?: unknown;
};

export type XpEventPresentationContext = {
  submissionTotalShots?: number | null;
  homeworkAssignmentTitle?: string | null;
  videoCustomFileName?: string | null;
};

export type XpActivityExclusionReason =
  | "inactive"
  | "duplicate_remove"
  | "source_key_deduped"
  | "missing_xp_activity_date"
  | "missing_linked_submission"
  | "incorrect_enrollment"
  | "missing_xp_event"
  | "not_eligible_submission";

export type XpActivityReconciliationRow = {
  expectedSubmissionId?: string;
  xpEventId?: string;
  xpEventExists: boolean;
  xpEventActive?: boolean;
  excluded: boolean;
  exclusionReason?: XpActivityExclusionReason;
  sourceDate?: string;
  displayedDate?: string;
  submissionActivityDate?: string;
  xpActivityDate?: string;
  created?: string;
  sourceKey?: string;
  duplicateStatus?: string;
  activeXpPoints?: number | null;
};

export type XpActivityLoadStrategy = "enrollment_record_id" | "linked_ids_fallback";

export type XpActivityLoadResult = {
  rows: XpEventSummary[];
  /** Active, enrollment-matched XP Events before the maxRows slice. */
  totalAvailableRows: number;
  strategy: XpActivityLoadStrategy;
  warning?: string;
  reconciliation: XpActivityReconciliationRow[];
  missingXpSubmissionIds: string[];
};

export class XpActivityLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "XpActivityLoadError";
  }
}

type LinkedIdsCacheEntry = {
  ids: string[];
  fetchedAt: number;
};

const linkedXpIdsCache = new Map<string, LinkedIdsCacheEntry>();
const linkedSubmissionIdsCache = new Map<string, LinkedIdsCacheEntry>();

/** @deprecated Broken — ARRAYJOIN({Enrollment}) returns athlete display names, not record IDs. */
export function buildBrokenEnrollmentJoinFilter(enrollmentId: string): string {
  return `FIND("${escapeAirtableString(enrollmentId)}", ARRAYJOIN({Enrollment}))`;
}

/** Preferred enrollment-scoped XP Events filter (Enrollment Record ID lookup). */
export function buildEnrollmentRecordIdFilter(enrollmentId: string): string {
  return `{${XP_EVENTS_ENROLLMENT_RECORD_ID_FIELD}}="${escapeAirtableString(enrollmentId)}"`;
}

export function isValidEnrollmentRecordId(value: string): boolean {
  return typeof value === "string" && value.startsWith("rec") && value.trim().length >= 14;
}

export function buildRecordIdOrFilter(ids: string[]): string | null {
  const unique = [...new Set(ids.filter((id) => id.startsWith("rec")))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return `RECORD_ID()="${unique[0]}"`;
  return `OR(${unique.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
}

export function chunkRecordIds(ids: string[], chunkSize = LINKED_ID_CHUNK_SIZE): string[][] {
  const unique = [...new Set(ids.filter((id) => id.startsWith("rec")))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }
  return chunks;
}

export function isDuplicateRemoveStatus(value: unknown): boolean {
  return asText(value, "") === DUPLICATE_REMOVE_STATUS;
}

export function submissionExpectsXp(fields: SubmissionRecordFields): boolean {
  return asBoolean(fields["Count This Submission?"]);
}

export function resolveXpEventDisplayDate(
  fields: XpEventRecordFields,
  submissionActivityDate?: unknown,
): { displayedDate: string | undefined; sourceDate: string | undefined; usedCreatedFallback: boolean } {
  const sourceLabel = asText(fields["XP Source"], "");
  const submissionDateKey = toAirtableDateKey(submissionActivityDate);
  const xpActivityDateKey = toAirtableDateKey(fields["XP Activity Date"]);
  const createdDateKey = toAirtableDateKey(fields.Created);

  if (sourceLabel === SUBMISSION_BASE_SOURCE && submissionDateKey) {
    return {
      displayedDate: submissionDateKey,
      sourceDate: submissionDateKey,
      usedCreatedFallback: false,
    };
  }

  if (xpActivityDateKey) {
    return {
      displayedDate: xpActivityDateKey,
      sourceDate: xpActivityDateKey,
      usedCreatedFallback: false,
    };
  }

  return {
    displayedDate: createdDateKey ?? undefined,
    sourceDate: submissionDateKey ?? createdDateKey ?? undefined,
    usedCreatedFallback: Boolean(createdDateKey),
  };
}

export function mapXpEventRecordToSummary(
  record: { id: string; fields: XpEventRecordFields },
  submissionActivityDate?: unknown,
  presentation?: XpEventPresentationContext,
): XpEventSummary {
  const fields = record.fields;
  const active = asBoolean(fields["Active?"]);
  const activePoints = asOptionalNumber(fields["Active XP Points"]);
  const rawPoints = asOptionalNumber(fields["XP Points"]);
  const points = active ? (activePoints ?? rawPoints ?? 0) : (rawPoints ?? 0);
  const { displayedDate } = resolveXpEventDisplayDate(fields, submissionActivityDate);

  const createdRaw = asText(fields.Created, "").trim();

  return {
    id: record.id,
    points,
    sourceLabel: asText(fields["XP Source"], "") || undefined,
    reasonPublic: asText(fields["XP Reason Public"], "") || undefined,
    activityDate: displayedDate,
    sortTimestamp: createdRaw || undefined,
    submissionTotalShots: presentation?.submissionTotalShots ?? undefined,
    homeworkAssignmentTitle: presentation?.homeworkAssignmentTitle ?? undefined,
    videoCustomFileName: presentation?.videoCustomFileName ?? undefined,
  };
}

/** Extract milestone / weekly-target percentage for same-day sub-sorting (higher first). */
export function extractXpEventPercent(row: XpEventSummary): number | null {
  const source = asText(row.sourceLabel, "");
  const reason = asText(row.reasonPublic, "");
  const hay = `${source} ${reason}`.toLowerCase();

  const weeklyFromSource = source.match(/weekly threshold\s*(\d+)/i)?.[1];
  if (weeklyFromSource) return Number(weeklyFromSource);

  const weeklyFromReason = reason.match(/reached\s+(\d+(?:\.\d+)?)\s*%\s*of\s+weekly/i)?.[1];
  if (weeklyFromReason) return Number(weeklyFromReason);

  const milestoneMatch =
    reason.match(/(\d+(?:\.\d+)?)\s*%\s*(?:\w+\s+)?milestone/i)?.[1] ??
    reason.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:target\s+)?goal/i)?.[1];
  if (milestoneMatch) return Number(milestoneMatch);

  if (hay.includes("milestone") || hay.includes("weekly threshold") || hay.includes("weekly shot goal")) {
    const generic = hay.match(/(\d+(?:\.\d+)?)\s*%/);
    if (generic) return Number(generic[1]);
  }

  return null;
}

export function xpSourceSortRank(
  sourceLabel: string | undefined,
  reasonPublic?: string | undefined,
): number {
  const source = asText(sourceLabel, "");
  if (source && XP_ACCOMPLISHMENT_SORT_RANK[source] != null) {
    return XP_ACCOMPLISHMENT_SORT_RANK[source];
  }

  const hay = `${source} ${asText(reasonPublic, "")}`.toLowerCase();
  if (hay.includes("manual bonus")) return 0;
  if (hay.includes("zoom")) return 1;
  if (hay.includes("video")) return 2;
  if (hay.includes("homework")) return 3;
  if (hay.includes("streak")) return 4;
  if (hay.includes("weekly threshold") || hay.includes("weekly shot goal")) return 5;
  if (hay.includes("perfect week")) return 5;
  if (hay.includes("milestone")) return 6;
  if (hay.includes("submission") || hay.includes("shooting base")) return 7;

  return 50;
}

export function sortXpEventsNewestFirst(events: XpEventSummary[]): XpEventSummary[] {
  return [...events].sort((a, b) => {
    const dateA = a.activityDate ?? "";
    const dateB = b.activityDate ?? "";
    const dateCmp = dateB.localeCompare(dateA);
    if (dateCmp !== 0) return dateCmp;

    const tsA = a.sortTimestamp ?? "";
    const tsB = b.sortTimestamp ?? "";
    if (tsA && tsB) {
      const tsCmp = tsB.localeCompare(tsA);
      if (tsCmp !== 0) return tsCmp;
    }

    const rankCmp =
      xpSourceSortRank(a.sourceLabel, a.reasonPublic) -
      xpSourceSortRank(b.sourceLabel, b.reasonPublic);
    if (rankCmp !== 0) return rankCmp;

    const pctA = extractXpEventPercent(a);
    const pctB = extractXpEventPercent(b);
    if (pctA != null && pctB != null && pctA !== pctB) {
      return pctB - pctA;
    }
    if (pctA != null && pctB == null) return -1;
    if (pctA == null && pctB != null) return 1;

    return b.id.localeCompare(a.id);
  });
}

/**
 * When duplicate Source Keys exist, keep the active row; otherwise prefer the newest Created date.
 */
export function dedupeXpEventRecords(
  records: Array<{ id: string; fields: XpEventRecordFields }>,
): {
  kept: Array<{ id: string; fields: XpEventRecordFields }>;
  dedupedIds: string[];
} {
  const byKey = new Map<string, { id: string; fields: XpEventRecordFields }>();
  const dedupedIds: string[] = [];

  for (const record of records) {
    const sourceKey = asText(record.fields["Source Key"], "").trim();
    const key = sourceKey && sourceKey !== "—" ? sourceKey : record.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }

    dedupedIds.push(record.id);

    const existingActive = asBoolean(existing.fields["Active?"]);
    const recordActive = asBoolean(record.fields["Active?"]);
    if (recordActive && !existingActive) {
      dedupedIds.push(existing.id);
      byKey.set(key, record);
      continue;
    }
    if (recordActive !== existingActive) continue;

    const existingCreated = toAirtableDateKey(existing.fields.Created) ?? "";
    const recordCreated = toAirtableDateKey(record.fields.Created) ?? "";
    if (recordCreated > existingCreated) {
      dedupedIds.push(existing.id);
      byKey.set(key, record);
    }
  }

  return { kept: [...byKey.values()], dedupedIds };
}

function readCachedIds(cache: Map<string, LinkedIdsCacheEntry>, enrollmentId: string): string[] | null {
  const entry = cache.get(enrollmentId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > LINKED_IDS_CACHE_TTL_MS) {
    cache.delete(enrollmentId);
    return null;
  }
  return entry.ids;
}

function writeCachedIds(
  cache: Map<string, LinkedIdsCacheEntry>,
  enrollmentId: string,
  ids: string[],
): void {
  if (cache.size >= LINKED_IDS_CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(enrollmentId, { ids, fetchedAt: Date.now() });
}

export function clearLinkedXpIdsCache(): void {
  linkedXpIdsCache.clear();
  linkedSubmissionIdsCache.clear();
}

async function fetchEnrollmentLinks(enrollmentId: string): Promise<{
  xpEventIds: string[];
  submissionIds: string[];
}> {
  const cachedXp = readCachedIds(linkedXpIdsCache, enrollmentId);
  const cachedSubs = readCachedIds(linkedSubmissionIdsCache, enrollmentId);
  if (cachedXp && cachedSubs) {
    return { xpEventIds: cachedXp, submissionIds: cachedSubs };
  }

  const response = await listAirtableRecords<{
    "XP Events"?: unknown;
    Submissions?: unknown;
  }>({
    tableName: PUBLIC_AIRTABLE_TABLES.enrollments.name,
    maxRecords: 1,
    fields: [...ENROLLMENT_LINK_FIELDS],
    filterByFormula: `RECORD_ID()="${escapeAirtableString(enrollmentId)}"`,
    revalidateSeconds: REVALIDATE_SECONDS,
  });

  const enrollment = response.records[0];
  const xpEventIds = enrollment ? linkedRecordIds(enrollment.fields["XP Events"]) : [];
  const submissionIds = enrollment ? linkedRecordIds(enrollment.fields.Submissions) : [];
  writeCachedIds(linkedXpIdsCache, enrollmentId, xpEventIds);
  writeCachedIds(linkedSubmissionIdsCache, enrollmentId, submissionIds);
  return { xpEventIds, submissionIds };
}

export async function fetchLinkedXpEventIds(enrollmentId: string): Promise<string[]> {
  const cached = readCachedIds(linkedXpIdsCache, enrollmentId);
  if (cached) return cached;
  const links = await fetchEnrollmentLinks(enrollmentId);
  return links.xpEventIds;
}

export async function fetchLinkedSubmissionIds(enrollmentId: string): Promise<string[]> {
  const cached = readCachedIds(linkedSubmissionIdsCache, enrollmentId);
  if (cached) return cached;
  const links = await fetchEnrollmentLinks(enrollmentId);
  return links.submissionIds;
}

async function fetchRecordsByIds<TFields extends Record<string, unknown>>(
  tableName: string,
  ids: string[],
  fields: readonly string[],
  maxRecords: number,
): Promise<Array<{ id: string; fields: TFields }>> {
  const chunks = chunkRecordIds(ids);
  if (chunks.length === 0) return [];

  const collected = new Map<string, { id: string; fields: TFields }>();

  for (const chunk of chunks) {
    const filter = buildRecordIdOrFilter(chunk);
    if (!filter) continue;

    const response = await listAirtableRecords<TFields>({
      tableName,
      fields: [...fields],
      filterByFormula: filter,
      maxRecords: Math.min(maxRecords, 100),
      revalidateSeconds: REVALIDATE_SECONDS,
    });

    for (const record of response.records) {
      collected.set(record.id, record);
    }
  }

  return [...collected.values()];
}

function isEnrollmentRecordIdFieldError(error: unknown): boolean {
  return (
    error instanceof AirtableApiError &&
    /UNKNOWN_FIELD_NAME|Unknown field names|Invalid formula/i.test(error.body)
  );
}

function enrollmentMatches(
  fields: XpEventRecordFields,
  enrollmentId: string,
): boolean {
  const lookupIds = linkedRecordIds(fields["Enrollment Record ID"]);
  if (lookupIds.length === 0) return true;
  return lookupIds.includes(enrollmentId);
}

export function buildXpActivityReconciliation(
  submissions: Array<{ id: string; fields: SubmissionRecordFields }>,
  xpRecords: Array<{ id: string; fields: XpEventRecordFields }>,
  enrollmentId: string,
  dedupedXpIds: string[],
): XpActivityReconciliationRow[] {
  const xpById = new Map(xpRecords.map((record) => [record.id, record]));
  const xpBySubmissionId = new Map<string, Array<{ id: string; fields: XpEventRecordFields }>>();

  for (const record of xpRecords) {
    for (const submissionId of linkedRecordIds(record.fields.Submission)) {
      const bucket = xpBySubmissionId.get(submissionId) ?? [];
      bucket.push(record);
      xpBySubmissionId.set(submissionId, bucket);
    }
  }

  const rows: XpActivityReconciliationRow[] = [];

  for (const submission of submissions) {
    const fields = submission.fields;
    const submissionActivityDate = toAirtableDateKey(fields["Activity Date"]);
    const expectsXp = submissionExpectsXp(fields);

    const linkedFromSubmission = linkedRecordIds(fields["XP Events"])
      .map((id) => xpById.get(id))
      .filter((record): record is { id: string; fields: XpEventRecordFields } => Boolean(record));
    const linkedFromXpField = xpBySubmissionId.get(submission.id) ?? [];
    const linkedXp = [...new Map(
      [...linkedFromSubmission, ...linkedFromXpField].map((record) => [record.id, record]),
    ).values()];

    const canonicalSourceKey = `${SUBMISSION_XP_SOURCE_KEY_PREFIX}${submission.id}`;
    const canonicalXp = linkedXp.find(
      (record) => asText(record.fields["Source Key"], "").trim() === canonicalSourceKey,
    );

    if (!expectsXp) {
      rows.push({
        expectedSubmissionId: submission.id,
        xpEventExists: linkedXp.length > 0,
        excluded: true,
        exclusionReason: "not_eligible_submission",
        submissionActivityDate: submissionActivityDate ?? undefined,
        sourceDate: submissionActivityDate ?? undefined,
      });
      continue;
    }

    if (linkedXp.length === 0) {
      rows.push({
        expectedSubmissionId: submission.id,
        xpEventExists: false,
        excluded: true,
        exclusionReason: "missing_xp_event",
        submissionActivityDate: submissionActivityDate ?? undefined,
        sourceDate: submissionActivityDate ?? undefined,
      });
      continue;
    }

    const xpRecord = canonicalXp ?? linkedXp[0];
    const xf = xpRecord.fields;
    const { displayedDate, sourceDate, usedCreatedFallback } = resolveXpEventDisplayDate(
      xf,
      fields["Activity Date"],
    );

    let exclusionReason: XpActivityExclusionReason | undefined;
    let excluded = false;

    if (!enrollmentMatches(xf, enrollmentId)) {
      excluded = true;
      exclusionReason = "incorrect_enrollment";
    } else if (isDuplicateRemoveStatus(xf["Duplicate Status"])) {
      excluded = true;
      exclusionReason = "duplicate_remove";
    } else if (!asBoolean(xf["Active?"])) {
      excluded = true;
      exclusionReason = "inactive";
    } else if (dedupedXpIds.includes(xpRecord.id)) {
      excluded = true;
      exclusionReason = "source_key_deduped";
    } else if (
      asText(xf["XP Source"], "") === SUBMISSION_BASE_SOURCE &&
      linkedRecordIds(xf.Submission).length === 0
    ) {
      excluded = true;
      exclusionReason = "missing_linked_submission";
    } else if (usedCreatedFallback) {
      excluded = true;
      exclusionReason = "missing_xp_activity_date";
    }

    rows.push({
      expectedSubmissionId: submission.id,
      xpEventId: xpRecord.id,
      xpEventExists: true,
      xpEventActive: asBoolean(xf["Active?"]),
      excluded,
      exclusionReason,
      sourceDate: sourceDate ?? undefined,
      displayedDate: displayedDate ?? undefined,
      submissionActivityDate: submissionActivityDate ?? undefined,
      xpActivityDate: toAirtableDateKey(xf["XP Activity Date"]) ?? undefined,
      created: toAirtableDateKey(xf.Created) ?? undefined,
      sourceKey: asText(xf["Source Key"], "") || undefined,
      duplicateStatus: asText(xf["Duplicate Status"], "") || undefined,
      activeXpPoints: asOptionalNumber(xf["Active XP Points"]),
    });
  }

  return rows;
}

function resolveVideoDisplayFileName(fields: VideoFeedbackRecordFields): string | null {
  const custom = asText(fields["Custom Video File Name"], "").trim();
  if (custom && custom !== "—") return custom;
  const asset = asText(fields["Video Asset File Name"], "").trim();
  if (asset && asset !== "—") return asset;
  return null;
}

function resolveHomeworkAssignmentTitle(
  phaFields: ProgramHomeworkAssignmentFields,
  libraryById: Map<string, { fields: HomeworkLibraryTitleFields }>,
): string | null {
  const fromPha = asText(phaFields["Assignment Title"], "").trim();
  if (fromPha && fromPha !== "—") return fromPha;
  const libraryId = linkedRecordIds(phaFields["Homework Assignment"])[0];
  if (!libraryId) return null;
  const library = libraryById.get(libraryId);
  if (!library) return null;
  const fromLibrary = asText(library.fields["Assignment Title"], "").trim();
  return fromLibrary && fromLibrary !== "—" ? fromLibrary : null;
}

export async function buildXpEventPresentationContext(
  xpRecords: Array<{ id: string; fields: XpEventRecordFields }>,
  submissionById: Map<string, { id: string; fields: SubmissionRecordFields }>,
): Promise<Map<string, XpEventPresentationContext>> {
  const contextByXpId = new Map<string, XpEventPresentationContext>();

  const homeworkCompletionIds = new Set<string>();
  const videoFeedbackIds = new Set<string>();

  for (const record of xpRecords) {
    for (const id of linkedRecordIds(record.fields["Homework Completion"])) {
      homeworkCompletionIds.add(id);
    }
    for (const id of linkedRecordIds(record.fields["Video Feedback"])) {
      videoFeedbackIds.add(id);
    }
  }

  const homeworkCompletions = await fetchRecordsByIds<HomeworkCompletionRecordFields>(
    PUBLIC_AIRTABLE_TABLES.homeworkCompletions.name,
    [...homeworkCompletionIds],
    ["Program Homework Assignment"],
    300,
  );

  const phaIds = [
    ...new Set(
      homeworkCompletions.flatMap((record) =>
        linkedRecordIds(record.fields["Program Homework Assignment"]),
      ),
    ),
  ];
  const phaRecords = await fetchRecordsByIds<ProgramHomeworkAssignmentFields>(
    PUBLIC_AIRTABLE_TABLES.programHomeworkAssignments.name,
    phaIds,
    ["Homework Assignment", "Assignment Title"],
    300,
  );
  const phaById = new Map(phaRecords.map((record) => [record.id, record]));

  const libraryIds = [
    ...new Set(
      phaRecords.flatMap((record) => linkedRecordIds(record.fields["Homework Assignment"])),
    ),
  ];
  const libraryRecords = await fetchRecordsByIds<HomeworkLibraryTitleFields>(
    PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name,
    libraryIds,
    ["Assignment Title"],
    300,
  );
  const libraryById = new Map(libraryRecords.map((record) => [record.id, record]));

  const homeworkTitleByHcId = new Map<string, string>();
  for (const hc of homeworkCompletions) {
    const phaId = linkedRecordIds(hc.fields["Program Homework Assignment"])[0];
    const pha = phaId ? phaById.get(phaId) : undefined;
    const title = pha ? resolveHomeworkAssignmentTitle(pha.fields, libraryById) : null;
    if (title) homeworkTitleByHcId.set(hc.id, title);
  }

  const videoRecords = await fetchRecordsByIds<VideoFeedbackRecordFields>(
    PUBLIC_AIRTABLE_TABLES.videoFeedback.name,
    [...videoFeedbackIds],
    ["Custom Video File Name", "Video Asset File Name"],
    300,
  );
  const videoFileNameById = new Map<string, string>();
  for (const vf of videoRecords) {
    const fileName = resolveVideoDisplayFileName(vf.fields);
    if (fileName) videoFileNameById.set(vf.id, fileName);
  }

  for (const record of xpRecords) {
    const submissionIds = linkedRecordIds(record.fields.Submission);
    const submission = submissionIds[0] ? submissionById.get(submissionIds[0]) : undefined;
    const submissionTotalShots = submission
      ? asOptionalNumber(submission.fields["Total Shots Counted"])
      : null;

    const hcId = linkedRecordIds(record.fields["Homework Completion"])[0];
    const vfId = linkedRecordIds(record.fields["Video Feedback"])[0];

    contextByXpId.set(record.id, {
      submissionTotalShots,
      homeworkAssignmentTitle: hcId ? (homeworkTitleByHcId.get(hcId) ?? null) : null,
      videoCustomFileName: vfId ? (videoFileNameById.get(vfId) ?? null) : null,
    });
  }

  return contextByXpId;
}

function resolveXpEventPresentation(
  record: { id: string; fields: XpEventRecordFields },
  submissionById: Map<string, { id: string; fields: SubmissionRecordFields }>,
  presentationByXpId: Map<string, XpEventPresentationContext>,
): XpEventSummary {
  const submissionIds = linkedRecordIds(record.fields.Submission);
  const submission = submissionIds[0] ? submissionById.get(submissionIds[0]) : undefined;
  return mapXpEventRecordToSummary(
    record,
    submission?.fields["Activity Date"],
    presentationByXpId.get(record.id),
  );
}

/**
 * Load XP activity rows for one enrollment.
 * Returns an empty array when the athlete truly has no XP Events.
 * Throws when the enrollment id is invalid or linked XP Events cannot be resolved.
 */
export async function loadXpActivityForEnrollment(
  enrollmentId: string,
  options?: {
    /** Slice sorted rows after load. `null` returns the full sorted set (up to maxFetch). */
    maxRows?: number | null;
    /** Cap on Airtable rows fetched before sort/dedupe. */
    maxFetch?: number;
    includeInactive?: boolean;
    revalidateSeconds?: number;
  },
): Promise<XpActivityLoadResult> {
  if (!isValidEnrollmentRecordId(enrollmentId)) {
    throw new XpActivityLoadError(`Invalid enrollment record id: "${enrollmentId}"`);
  }

  const maxRows = options?.maxRows ?? DEFAULT_MAX_ROWS;
  const includeInactive = options?.includeInactive ?? false;
  const revalidateSeconds = options?.revalidateSeconds ?? REVALIDATE_SECONDS;
  const maxFetch = options?.maxFetch ?? DEFAULT_MAX_FETCH;
  const fetchLimit =
    maxRows === null
      ? maxFetch
      : Math.min(Math.max(maxRows * 3, maxRows), maxFetch);

  let strategy: XpActivityLoadStrategy = "enrollment_record_id";
  let warning: string | undefined;
  let records: Array<{ id: string; fields: XpEventRecordFields }> = [];

  const { xpEventIds: linkedXpIds, submissionIds: linkedSubmissionIds } =
    await fetchEnrollmentLinks(enrollmentId);

  try {
    const response = await listAirtableRecords<XpEventRecordFields>({
      tableName: XP_EVENTS_TABLE,
      fields: [...XP_EVENT_FIELDS],
      filterByFormula: buildEnrollmentRecordIdFilter(enrollmentId),
      sort: [
        { field: "XP Activity Date", direction: "desc" },
        { field: "Created", direction: "desc" },
      ],
      maxRecords: fetchLimit,
      revalidateSeconds,
    });
    records = response.records;
  } catch (error) {
    if (!isEnrollmentRecordIdFieldError(error)) {
      throw new XpActivityLoadError(
        `Failed to query XP Events for enrollment ${enrollmentId}`,
        { cause: error },
      );
    }
    strategy = "linked_ids_fallback";
    warning =
      "XP Events → Enrollment Record ID is unavailable in this base; using Enrollment-linked XP Event IDs.";
  }

  if (records.length === 0 && linkedXpIds.length > 0) {
    strategy = "linked_ids_fallback";
    if (!warning) {
      warning =
        "Enrollment-scoped filter returned no XP rows while Enrollment has linked XP Events; loaded via linked-record fallback.";
    }
    records = await fetchRecordsByIds<XpEventRecordFields>(
      XP_EVENTS_TABLE,
      linkedXpIds,
      XP_EVENT_FIELDS,
      fetchLimit,
    );
  }

  if (records.length === 0 && linkedXpIds.length > 0) {
    throw new XpActivityLoadError(
      `Enrollment ${enrollmentId} has ${linkedXpIds.length} linked XP Events but none could be loaded.`,
    );
  }

  const submissions = await fetchRecordsByIds<SubmissionRecordFields>(
    SUBMISSIONS_TABLE,
    linkedSubmissionIds,
    SUBMISSION_FIELDS,
    300,
  );
  const submissionById = new Map(submissions.map((record) => [record.id, record]));

  const { kept, dedupedIds } = dedupeXpEventRecords(records);

  const displayCandidates = kept.filter((record) => {
    if (!enrollmentMatches(record.fields, enrollmentId)) return false;
    if (isDuplicateRemoveStatus(record.fields["Duplicate Status"])) return false;
    if (!includeInactive && !asBoolean(record.fields["Active?"])) return false;
    return true;
  });

  const totalAvailableRows = displayCandidates.length;

  const presentationByXpId = await buildXpEventPresentationContext(kept, submissionById);

  const sortedRows = sortXpEventsNewestFirst(
    displayCandidates.map((record) =>
      resolveXpEventPresentation(record, submissionById, presentationByXpId),
    ),
  );
  const rows =
    maxRows === null ? sortedRows : sortedRows.slice(0, maxRows);

  const reconciliation = buildXpActivityReconciliation(
    submissions,
    records,
    enrollmentId,
    dedupedIds,
  );

  const missingXpSubmissionIds = reconciliation
    .filter((row) => row.exclusionReason === "missing_xp_event" && row.expectedSubmissionId)
    .map((row) => row.expectedSubmissionId as string);

  if (missingXpSubmissionIds.length > 0) {
    const missingNote = `${missingXpSubmissionIds.length} counted submission(s) have no XP Event: ${missingXpSubmissionIds.join(", ")}`;
    warning = warning ? `${warning} ${missingNote}` : missingNote;
  }

  return {
    rows,
    totalAvailableRows,
    strategy,
    warning,
    reconciliation,
    missingXpSubmissionIds,
  };
}
