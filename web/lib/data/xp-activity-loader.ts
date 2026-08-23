/**
 * Server loaders for athlete XP activity pages.
 */

import { AirtableApiError } from "@/lib/airtable/errors";
import { listAirtableRecords } from "@/lib/airtable/client";
import {
  PROFILE_CACHE_TTL_SECONDS,
  cachedSegment,
  profileXpCacheKey,
  readCacheOutcome,
} from "@/lib/airtable/cache";
import { logAirtableRequest } from "@/lib/airtable/request-log";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { resolvePublicEnrollmentBySlug } from "@/lib/airtable/profile-queries";
import {
  AchievementHydrationFields,
  HomeworkHydrationFields,
  MilestoneHydrationFields,
  StreakHydrationFields,
  SubmissionHydrationFields,
  UnlockHydrationFields,
  VideoHydrationFields,
  XP_ACTIVITY_INITIAL_PAGE_SIZE,
  XP_ACTIVITY_LOAD_MORE_SIZE,
  XP_ACTIVITY_MAX_AIRTABLE_PAGE,
  XpEventActivityFields,
  ZoomHydrationFields,
  buildRowKeyToRecordId,
  chunkRecordIds,
  collectHydrationIds,
  decodeXpActivityCursor,
  mapXpEventToActivityRow,
  mapXpEventsToRows,
  orderXpActivityRows,
  paginateOrderedXpRows,
  recordIdOrFilter,
  toHydrationContext,
} from "@/lib/data/xp-activity";
import type { XpActivityLoadResult, XpActivityPage } from "@/types/xp-activity";

const AIRTABLE_TABLES = {
  submissions: PUBLIC_AIRTABLE_TABLES.submissions.name,
  homeworkCompletions: PUBLIC_AIRTABLE_TABLES.homeworkCompletions.name,
  videoFeedback: PUBLIC_AIRTABLE_TABLES.videoFeedback.name,
  zoomMeetings: PUBLIC_AIRTABLE_TABLES.zoomMeetings.name,
  achievementUnlocks: PUBLIC_AIRTABLE_TABLES.achievementUnlocks.name,
  achievements: PUBLIC_AIRTABLE_TABLES.achievements.name,
  xpEvents: PUBLIC_AIRTABLE_TABLES.xpEvents.name,
} as const;

const XP_EVENT_ACTIVITY_FIELDS = [
  "Active?",
  "Active XP Points",
  "XP Reason Public",
  "XP Source",
  "XP Bucket",
  "XP Activity Date",
  "Created",
  "Submission",
  "Homework Completion",
  "Video Feedback",
  "Achievement Unlock",
  "Shot Milestones",
  "Streak Occurrence",
  "Zoom Meeting",
  "Duplicate Status",
  "Enrollment",
] as const;

const SUBMISSION_HYDRATION_FIELDS = [
  "Activity Date",
  "Total Shots Counted",
  "Total Makes Counted",
  "Submission Stat Mode",
  "Count This Submission?",
] as const;

const HOMEWORK_HYDRATION_FIELDS = ["Homework Completion Full Name", "Homework"] as const;
const VIDEO_HYDRATION_FIELDS = ["Video Title", "Video Type"] as const;
const MILESTONE_HYDRATION_FIELDS = ["Milestone Label", "Milestone Percent", "Grade Band"] as const;
const ZOOM_HYDRATION_FIELDS = ["Meeting Name", "Meeting Display Name"] as const;
const UNLOCK_HYDRATION_FIELDS = ["Achievement", "Achievement Type", "Shot Milestone"] as const;
const ACHIEVEMENT_HYDRATION_FIELDS = ["Achievement Name"] as const;
const STREAK_HYDRATION_FIELDS = ["Streak Length Days"] as const;

function xpEligibilityFormula(enrollmentId: string): string {
  return `AND({Active?}, OR({Duplicate Status}="", {Duplicate Status}="Unique", {Duplicate Status}="Duplicate - Keeper"), FIND("${enrollmentId}", ARRAYJOIN({Enrollment})))`;
}

async function listRecordsByIds<TFields extends Record<string, unknown>>(
  tableName: string,
  fields: readonly string[],
  ids: string[],
): Promise<Array<{ id: string; fields: TFields }>> {
  const chunks = chunkRecordIds(ids);
  if (chunks.length === 0) return [];

  const responses = await Promise.all(
    chunks.map((chunkIds) => {
      const filter = recordIdOrFilter(chunkIds);
      if (!filter) return Promise.resolve({ records: [] as Array<{ id: string; fields: TFields }> });
      return listAirtableRecords<TFields>({
        tableName,
        maxRecords: chunkIds.length,
        fields: [...fields],
        filterByFormula: filter,
        revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
      });
    }),
  );

  return responses.flatMap((response) => response.records);
}

async function hydrateXpRecords(
  records: Array<{ id: string; fields: XpEventActivityFields }>,
): Promise<ReturnType<typeof toHydrationContext>> {
  const ids = collectHydrationIds(records);
  const [
    submissions,
    homework,
    videos,
    milestones,
    zoomMeetings,
    unlocks,
    streaks,
  ] = await Promise.all([
    listRecordsByIds<SubmissionHydrationFields>(
      AIRTABLE_TABLES.submissions,
      SUBMISSION_HYDRATION_FIELDS,
      ids.submissionIds,
    ),
    listRecordsByIds<HomeworkHydrationFields>(
      AIRTABLE_TABLES.homeworkCompletions,
      HOMEWORK_HYDRATION_FIELDS,
      ids.homeworkIds,
    ),
    listRecordsByIds<VideoHydrationFields>(
      AIRTABLE_TABLES.videoFeedback,
      VIDEO_HYDRATION_FIELDS,
      ids.videoIds,
    ),
    listRecordsByIds<MilestoneHydrationFields>(
      "Shot Milestones",
      MILESTONE_HYDRATION_FIELDS,
      ids.milestoneIds,
    ),
    listRecordsByIds<ZoomHydrationFields>(
      AIRTABLE_TABLES.zoomMeetings,
      ZOOM_HYDRATION_FIELDS,
      ids.zoomIds,
    ),
    listRecordsByIds<UnlockHydrationFields>(
      AIRTABLE_TABLES.achievementUnlocks,
      UNLOCK_HYDRATION_FIELDS,
      ids.unlockIds,
    ),
    listRecordsByIds<StreakHydrationFields>(
      "Streak Occurrences",
      STREAK_HYDRATION_FIELDS,
      ids.streakIds,
    ),
  ]);

  const achievementIds = unlocks.flatMap((record) => {
    const value = record.fields.Achievement;
    return Array.isArray(value) ? value.map(String) : [];
  });

  const achievements = await listRecordsByIds<AchievementHydrationFields>(
    AIRTABLE_TABLES.achievements,
    ACHIEVEMENT_HYDRATION_FIELDS,
    achievementIds,
  );

  return toHydrationContext({
    submissions,
    homework,
    videos,
    milestones,
    zoomMeetings,
    unlocks,
    achievements,
    streaks,
  });
}

async function fetchEnrollmentXpEventRecords(
  enrollmentId: string,
): Promise<Array<{ id: string; fields: XpEventActivityFields }>> {
  const started = Date.now();
  const response = await listAirtableRecords<XpEventActivityFields>({
    tableName: AIRTABLE_TABLES.xpEvents,
    fields: [...XP_EVENT_ACTIVITY_FIELDS],
    filterByFormula: xpEligibilityFormula(enrollmentId),
    sort: [
      { field: "XP Activity Date", direction: "desc" },
      { field: "Created", direction: "desc" },
    ],
    maxRecords: 500,
    revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
  });

  logAirtableRequest({
    scope: "airtable-xp",
    table: "XP Events",
    durationMs: Date.now() - started,
    records: response.records.length,
    cache: "miss",
  });

  return response.records;
}

function cachedEnrollmentXpRecords(enrollmentId: string) {
  const cacheKey = `profile:xp-records:${enrollmentId}`;
  return cachedSegment(
    cacheKey,
    ["profile-xp", `enrollment:${enrollmentId}`],
    PROFILE_CACHE_TTL_SECONDS,
    () => fetchEnrollmentXpEventRecords(enrollmentId),
  );
}

export async function loadXpActivityPageForSlug(
  slug: string,
  cursor: string | null,
  pageSize: number = cursor ? XP_ACTIVITY_LOAD_MORE_SIZE : XP_ACTIVITY_INITIAL_PAGE_SIZE,
): Promise<XpActivityLoadResult> {
  const resolution = await resolvePublicEnrollmentBySlug(slug);
  if (resolution.status === "not_found") {
    return { status: "not_found", slug: resolution.slug };
  }
  if (resolution.status === "error") {
    return { status: "error", slug: resolution.slug, message: resolution.message };
  }

  const enrollment = resolution.enrollment;
  const cacheKey = profileXpCacheKey(slug, cursor ?? "initial");

  try {
    const page = await cachedSegment(
      cacheKey,
      ["profile-xp", `athlete:${slug}`],
      PROFILE_CACHE_TTL_SECONDS,
      async () => buildXpActivityPageForEnrollment(enrollment.id, cursor, pageSize),
    );

    logAirtableRequest({
      scope: "airtable-xp",
      table: "XP Events",
      durationMs: 0,
      records: page.rows.length,
      cache: readCacheOutcome(cacheKey),
    });

    return { status: "ok", data: page };
  } catch (error) {
    const message =
      error instanceof AirtableApiError
        ? `Airtable error (${error.status})`
        : error instanceof Error
          ? error.message
          : "Unknown error";
    return { status: "error", slug: resolution.slug, message };
  }
}

async function buildXpActivityPageForEnrollment(
  enrollmentId: string,
  cursor: string | null,
  pageSize: number,
): Promise<XpActivityPage> {
  const rawRecords = await cachedEnrollmentXpRecords(enrollmentId);
  const skeletonRows = mapXpEventsToRows(rawRecords, toHydrationContext({}));
  const orderedSkeleton = orderXpActivityRows(skeletonRows);
  const rowKeyToRecordId = buildRowKeyToRecordId(rawRecords);
  const decodedCursor = decodeXpActivityCursor(cursor);
  const skeletonPage = paginateOrderedXpRows(
    orderedSkeleton,
    rowKeyToRecordId,
    pageSize,
    decodedCursor,
  );

  const pageRecordIds = new Set(
    skeletonPage.rows
      .map((row) => rowKeyToRecordId.get(row.key))
      .filter((id): id is string => Boolean(id)),
  );
  const pageRecords = rawRecords.filter((record) => pageRecordIds.has(record.id));
  const hydration = await hydrateXpRecords(pageRecords);
  const hydratedRows = pageRecords
    .map((record) => mapXpEventToActivityRow(record, hydration))
    .filter((row): row is NonNullable<typeof row> => row != null);

  const orderedHydrated = orderXpActivityRows(hydratedRows);
  const hydratedByKey = new Map(orderedHydrated.map((row) => [row.key, row]));

  return {
    rows: skeletonPage.rows
      .map((row) => hydratedByKey.get(row.key) ?? row)
      .filter((row): row is NonNullable<typeof row> => row != null),
    nextCursor: skeletonPage.nextCursor,
    hasMore: skeletonPage.hasMore,
  };
}

export { XP_ACTIVITY_MAX_AIRTABLE_PAGE };
