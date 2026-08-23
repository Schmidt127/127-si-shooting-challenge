/**
 * XP activity table — mapping, ordering, pagination, and hydration helpers.
 * Airtable XP Events remain the authoritative source; no frontend XP recalculation.
 */

import {
  asBoolean,
  asOptionalNumber,
  asText,
  linkedRecordIds,
} from "@/lib/data/airtable-values";
import { formatXpSourceLabel } from "@/lib/formatters";
import type {
  XpActivityPage,
  XpActivityRow,
  XpActivityRowKind,
} from "@/types/xp-activity";

export const XP_ACTIVITY_INITIAL_PAGE_SIZE = 75;
export const XP_ACTIVITY_LOAD_MORE_SIZE = 75;
export const XP_ACTIVITY_MAX_AIRTABLE_PAGE = 100;
export const XP_ACTIVITY_HYDRATION_CHUNK_SIZE = 50;

export type XpEventActivityFields = {
  "Active?"?: unknown;
  "Active XP Points"?: unknown;
  "XP Reason Public"?: unknown;
  "XP Source"?: unknown;
  "XP Bucket"?: unknown;
  "XP Activity Date"?: unknown;
  Created?: unknown;
  Submission?: unknown;
  "Homework Completion"?: unknown;
  "Video Feedback"?: unknown;
  "Achievement Unlock"?: unknown;
  "Shot Milestones"?: unknown;
  "Streak Occurrence"?: unknown;
  "Zoom Meeting"?: unknown;
  "Duplicate Status"?: unknown;
  Enrollment?: unknown;
};

export type SubmissionHydrationFields = {
  "Activity Date"?: unknown;
  "Total Shots Counted"?: unknown;
  "Total Makes Counted"?: unknown;
  "Submission Stat Mode"?: unknown;
  "Count This Submission?"?: unknown;
};

export type HomeworkHydrationFields = {
  "Homework Completion Full Name"?: unknown;
  Homework?: unknown;
};

export type VideoHydrationFields = {
  "Video Title"?: unknown;
  "Video Type"?: unknown;
};

export type MilestoneHydrationFields = {
  "Milestone Label"?: unknown;
  "Milestone Percent"?: unknown;
  "Grade Band"?: unknown;
};

export type ZoomHydrationFields = {
  "Meeting Name"?: unknown;
  "Meeting Display Name"?: unknown;
};

export type UnlockHydrationFields = {
  Achievement?: unknown;
  "Achievement Type"?: unknown;
  "Shot Milestone"?: unknown;
};

export type AchievementHydrationFields = {
  "Achievement Name"?: unknown;
};

export type StreakHydrationFields = {
  "Streak Length Days"?: unknown;
};

export type XpActivityCursorPayload = {
  v: 1;
  afterDateMs: number;
  afterId: string;
};

type HydratedXpContext = {
  submissions: Map<string, SubmissionHydrationFields>;
  homework: Map<string, HomeworkHydrationFields>;
  videos: Map<string, VideoHydrationFields>;
  milestones: Map<string, MilestoneHydrationFields>;
  zoomMeetings: Map<string, ZoomHydrationFields>;
  unlocks: Map<string, UnlockHydrationFields>;
  achievements: Map<string, AchievementHydrationFields>;
  streaks: Map<string, StreakHydrationFields>;
};

function isEligibleXpEvent(fields: XpEventActivityFields): boolean {
  if (!asBoolean(fields["Active?"])) return false;
  const duplicateStatus = asText(fields["Duplicate Status"], "");
  if (
    duplicateStatus === "Duplicate - Remove" ||
    duplicateStatus === "Duplicate - Review"
  ) {
    return false;
  }
  const points = asOptionalNumber(fields["Active XP Points"]);
  return points != null;
}

function toActivityDateMs(value: unknown, fallback: unknown): number {
  const primary = String(value ?? "").trim();
  const secondary = String(fallback ?? "").trim();
  const candidate = primary || secondary;
  if (!candidate) return 0;
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toActivityDateKey(value: unknown, fallback: unknown): string | null {
  const ms = toActivityDateMs(value, fallback);
  if (!ms) return null;
  return new Date(ms).toISOString();
}

function bucketKind(bucket: string, source: string): XpActivityRowKind {
  const normalizedBucket = bucket.toLowerCase();
  const normalizedSource = source.toLowerCase();

  if (normalizedBucket.includes("shooting") || normalizedSource.includes("submission base")) {
    return "shooting_submission";
  }
  if (normalizedBucket.includes("homework") || normalizedSource.includes("homework")) {
    return "homework";
  }
  if (normalizedBucket.includes("video") || normalizedSource.includes("video")) {
    return "video";
  }
  if (normalizedBucket.includes("shot milestone") || normalizedSource.includes("shot milestone")) {
    return "shot_milestone";
  }
  if (normalizedSource.includes("perfect week")) return "perfect_week";
  if (normalizedBucket.includes("streak") || normalizedSource.includes("streak")) return "streak";
  if (normalizedBucket.includes("zoom") || normalizedSource.includes("zoom")) return "zoom";
  if (
    normalizedBucket.includes("weekly threshold") ||
    normalizedSource.includes("weekly threshold")
  ) {
    return "weekly_threshold";
  }
  if (
    normalizedBucket.includes("perfect week") ||
    normalizedSource.includes("achievement") ||
    normalizedBucket.includes("manual")
  ) {
    return normalizedSource.includes("shot milestone") ? "shot_milestone" : "achievement";
  }
  if (normalizedSource.includes("coach bonus") || normalizedSource.includes("manual")) {
    return "manual";
  }
  return "other";
}

function kindRank(kind: XpActivityRowKind): number {
  switch (kind) {
    case "shooting_submission":
      return 0;
    case "shot_milestone":
    case "achievement":
      return 1;
    case "homework":
      return 2;
    case "video":
      return 3;
    case "streak":
      return 4;
    case "perfect_week":
      return 5;
    case "zoom":
      return 6;
    case "weekly_threshold":
      return 7;
    case "manual":
      return 8;
    default:
      return 9;
  }
}

function gradeBandLabel(value: unknown): string | null {
  const text = asText(value, "");
  return text && text !== "—" ? text : null;
}

function formatShotMilestoneDetail(
  milestone: MilestoneHydrationFields | undefined,
): string | null {
  if (!milestone) return null;
  const label = asText(milestone["Milestone Label"], "");
  if (label && label !== "—") return label;
  const percent = asOptionalNumber(milestone["Milestone Percent"]);
  const band = gradeBandLabel(milestone["Grade Band"]);
  if (percent != null && band) return `${band} · ${percent}% of goal`;
  if (percent != null) return `${percent}% of goal`;
  return null;
}

function buildRowKey(recordId: string): string {
  return `xp-${recordId.slice(-8)}`;
}

function parentKeyForSubmission(submissionId: string | null): string | null {
  return submissionId ? `submission-${submissionId.slice(-8)}` : null;
}

export function mapXpEventToActivityRow(
  record: { id: string; fields: XpEventActivityFields },
  context: HydratedXpContext,
): XpActivityRow | null {
  const fields = record.fields;
  if (!isEligibleXpEvent(fields)) return null;

  const submissionIds = linkedRecordIds(fields.Submission);
  const submissionId = submissionIds[0] ?? null;
  const submissionGroupKey = parentKeyForSubmission(submissionId);
  const homeworkId = linkedRecordIds(fields["Homework Completion"])[0] ?? null;
  const videoId = linkedRecordIds(fields["Video Feedback"])[0] ?? null;
  const milestoneId = linkedRecordIds(fields["Shot Milestones"])[0] ?? null;
  const unlockId = linkedRecordIds(fields["Achievement Unlock"])[0] ?? null;
  const streakId = linkedRecordIds(fields["Streak Occurrence"])[0] ?? null;
  const zoomId = linkedRecordIds(fields["Zoom Meeting"])[0] ?? null;

  const source = asText(fields["XP Source"], "");
  const bucket = asText(fields["XP Bucket"], "");
  const kind = bucketKind(bucket, source);
  const xp = asOptionalNumber(fields["Active XP Points"]) ?? 0;
  const activityDate = toActivityDateKey(fields["XP Activity Date"], fields.Created);
  const sortDateMs = toActivityDateMs(fields["XP Activity Date"], fields.Created);

  let title = asText(fields["XP Reason Public"], "");
  let detail: string | null = null;
  let parentKey = submissionGroupKey;
  let rowKey = buildRowKey(record.id);

  if (kind === "shooting_submission" && submissionGroupKey) {
    rowKey = submissionGroupKey;
    parentKey = null;
  }

  if (!title || title === "—") {
    title = formatXpSourceLabel(source);
  }

  if (kind === "shooting_submission" && submissionId) {
    const submission = context.submissions.get(submissionId);
    const shots = asOptionalNumber(submission?.["Total Shots Counted"]);
    const makes = asOptionalNumber(submission?.["Total Makes Counted"]);
    const mode = asText(submission?.["Submission Stat Mode"], "");
    title = "Daily shooting submission";
    if (shots != null) {
      detail =
        mode === "Detailed Shooting" && makes != null
          ? `${shots} shots · ${makes} makes`
          : `${shots} shots`;
    }
  } else if (kind === "homework" && homeworkId) {
    const hw = context.homework.get(homeworkId);
    const hwName = asText(hw?.["Homework Completion Full Name"], "");
    if (hwName && hwName !== "—") {
      detail = hwName;
    }
  } else if (kind === "video" && videoId) {
    const video = context.videos.get(videoId);
    const videoTitle = asText(video?.["Video Title"], "");
    if (videoTitle && videoTitle !== "—") {
      detail = videoTitle;
    }
  } else if (kind === "shot_milestone") {
    const milestone = milestoneId ? context.milestones.get(milestoneId) : undefined;
    detail = formatShotMilestoneDetail(milestone);
    if (!title || title === "XP") title = "Shot milestone";
  } else if (kind === "perfect_week") {
    title = "Perfect Week";
  } else if (kind === "zoom" && zoomId) {
    const meeting = context.zoomMeetings.get(zoomId);
    const displayName = asText(meeting?.["Meeting Display Name"], "");
    const meetingName = asText(meeting?.["Meeting Name"], "");
    detail =
      displayName && displayName !== "—"
        ? displayName
        : meetingName && meetingName !== "—"
          ? meetingName
          : null;
  } else if (kind === "streak" && streakId) {
    const streak = context.streaks.get(streakId);
    const days = asOptionalNumber(streak?.["Streak Length Days"]);
    if (days != null) detail = `${days}-day streak`;
  } else if (kind === "achievement" && unlockId) {
    const unlock = context.unlocks.get(unlockId);
    const achievementId = linkedRecordIds(unlock?.Achievement)[0];
    const achievement = achievementId ? context.achievements.get(achievementId) : undefined;
    const achievementName = asText(achievement?.["Achievement Name"], "");
    if (achievementName && achievementName !== "—") {
      detail = achievementName;
    }
  }

  return {
    key: rowKey,
    kind,
    activityDate,
    title,
    detail,
    xp,
    sourceLabel: source || null,
    bucket: bucket || null,
    sortDateMs,
    sortRank: kindRank(kind),
    parentKey,
  };
}

export function orderXpActivityRows(rows: XpActivityRow[]): XpActivityRow[] {
  const childrenByParent = new Map<string, XpActivityRow[]>();

  for (const row of rows) {
    if (!row.parentKey) continue;
    const siblings = childrenByParent.get(row.parentKey) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parentKey, siblings);
  }

  const parents = rows
    .filter(
      (row) =>
        row.kind === "shooting_submission" ||
        rows.some((candidate) => candidate.parentKey === row.key),
    )
    .sort((a, b) => b.sortDateMs - a.sortDateMs || a.sortRank - b.sortRank);

  const emitted = new Set<string>();
  const ordered: XpActivityRow[] = [];

  function emit(row: XpActivityRow): void {
    if (emitted.has(row.key)) return;
    emitted.add(row.key);
    ordered.push(row);
  }

  for (const parent of parents) {
    emit(parent);
    const children = (childrenByParent.get(parent.key) ?? []).sort(
      (a, b) => a.sortRank - b.sortRank || b.sortDateMs - a.sortDateMs,
    );
    for (const child of children) emit(child);
  }

  const remainder = rows
    .filter((row) => !emitted.has(row.key))
    .sort(
      (a, b) =>
        b.sortDateMs - a.sortDateMs ||
        a.sortRank - b.sortRank ||
        a.title.localeCompare(b.title),
    );

  for (const row of remainder) emit(row);

  return ordered;
}

export function mergeXpActivityPages(
  existing: XpActivityRow[],
  incoming: XpActivityRow[],
): XpActivityRow[] {
  const merged = new Map<string, XpActivityRow>();
  for (const row of existing) merged.set(row.key, row);
  for (const row of incoming) merged.set(row.key, row);
  return orderXpActivityRows([...merged.values()]);
}

export function encodeXpActivityCursor(payload: XpActivityCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeXpActivityCursor(cursor: string | null | undefined): XpActivityCursorPayload | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as XpActivityCursorPayload;
    if (parsed?.v !== 1 || typeof parsed.afterDateMs !== "number" || typeof parsed.afterId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function paginateOrderedXpRows(
  orderedRows: XpActivityRow[],
  rowKeyToRecordId: Map<string, string>,
  pageSize: number,
  cursor: XpActivityCursorPayload | null,
): XpActivityPage {
  let startIndex = 0;
  if (cursor) {
    const exact = orderedRows.findIndex((row) => rowKeyToRecordId.get(row.key) === cursor.afterId);
    if (exact >= 0) {
      startIndex = exact + 1;
    } else {
      startIndex = orderedRows.findIndex((row) => row.sortDateMs < cursor.afterDateMs);
      if (startIndex < 0) startIndex = orderedRows.length;
    }
  }

  const pageRows = orderedRows.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < orderedRows.length;
  const lastRow = pageRows.at(-1);
  const lastRecordId = lastRow ? rowKeyToRecordId.get(lastRow.key) : undefined;

  const nextCursor =
    hasMore && lastRecordId
      ? encodeXpActivityCursor({
          v: 1,
          afterDateMs: lastRow?.sortDateMs ?? 0,
          afterId: lastRecordId,
        })
      : null;

  return {
    rows: pageRows,
    nextCursor,
    hasMore,
  };
}

export function chunkRecordIds(ids: string[], chunkSize = XP_ACTIVITY_HYDRATION_CHUNK_SIZE): string[][] {
  const unique = [...new Set(ids.filter((id) => /^rec[a-zA-Z0-9]{14}$/.test(id)))];
  const chunks: string[][] = [];
  for (let index = 0; index < unique.length; index += chunkSize) {
    chunks.push(unique.slice(index, index + chunkSize));
  }
  return chunks;
}

export function recordIdOrFilter(ids: string[]): string | null {
  if (ids.length === 0) return null;
  if (ids.length === 1) return `RECORD_ID()="${ids[0]}"`;
  return `OR(${ids.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
}

export function toHydrationContext(maps: {
  submissions?: Array<{ id: string; fields: SubmissionHydrationFields }>;
  homework?: Array<{ id: string; fields: HomeworkHydrationFields }>;
  videos?: Array<{ id: string; fields: VideoHydrationFields }>;
  milestones?: Array<{ id: string; fields: MilestoneHydrationFields }>;
  zoomMeetings?: Array<{ id: string; fields: ZoomHydrationFields }>;
  unlocks?: Array<{ id: string; fields: UnlockHydrationFields }>;
  achievements?: Array<{ id: string; fields: AchievementHydrationFields }>;
  streaks?: Array<{ id: string; fields: StreakHydrationFields }>;
}): HydratedXpContext {
  return {
    submissions: new Map((maps.submissions ?? []).map((record) => [record.id, record.fields])),
    homework: new Map((maps.homework ?? []).map((record) => [record.id, record.fields])),
    videos: new Map((maps.videos ?? []).map((record) => [record.id, record.fields])),
    milestones: new Map((maps.milestones ?? []).map((record) => [record.id, record.fields])),
    zoomMeetings: new Map((maps.zoomMeetings ?? []).map((record) => [record.id, record.fields])),
    unlocks: new Map((maps.unlocks ?? []).map((record) => [record.id, record.fields])),
    achievements: new Map((maps.achievements ?? []).map((record) => [record.id, record.fields])),
    streaks: new Map((maps.streaks ?? []).map((record) => [record.id, record.fields])),
  };
}

export function collectHydrationIds(
  records: Array<{ id: string; fields: XpEventActivityFields }>,
): {
  submissionIds: string[];
  homeworkIds: string[];
  videoIds: string[];
  milestoneIds: string[];
  zoomIds: string[];
  unlockIds: string[];
  streakIds: string[];
} {
  const submissionIds: string[] = [];
  const homeworkIds: string[] = [];
  const videoIds: string[] = [];
  const milestoneIds: string[] = [];
  const zoomIds: string[] = [];
  const unlockIds: string[] = [];
  const streakIds: string[] = [];

  for (const record of records) {
    submissionIds.push(...linkedRecordIds(record.fields.Submission));
    homeworkIds.push(...linkedRecordIds(record.fields["Homework Completion"]));
    videoIds.push(...linkedRecordIds(record.fields["Video Feedback"]));
    milestoneIds.push(...linkedRecordIds(record.fields["Shot Milestones"]));
    zoomIds.push(...linkedRecordIds(record.fields["Zoom Meeting"]));
    unlockIds.push(...linkedRecordIds(record.fields["Achievement Unlock"]));
    streakIds.push(...linkedRecordIds(record.fields["Streak Occurrence"]));
  }

  return {
    submissionIds,
    homeworkIds,
    videoIds,
    milestoneIds,
    zoomIds,
    unlockIds,
    streakIds,
  };
}

export function buildRowKeyToRecordId(
  records: Array<{ id: string; fields: XpEventActivityFields }>,
): Map<string, string> {
  const empty = toHydrationContext({});
  const map = new Map<string, string>();
  for (const record of records) {
    const row = mapXpEventToActivityRow(record, empty);
    if (row) map.set(row.key, record.id);
  }
  return map;
}

export function mapXpEventsToRows(
  records: Array<{ id: string; fields: XpEventActivityFields }>,
  context: HydratedXpContext,
): XpActivityRow[] {
  return records
    .map((record) => mapXpEventToActivityRow(record, context))
    .filter((row): row is XpActivityRow => row != null);
}
