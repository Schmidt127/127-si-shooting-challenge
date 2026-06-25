/**
 * Domain-specific Airtable queries.
 * Add one function per page/feature; keep field names aligned with docs/airtable-data-map.md.
 */

import { isMissingAirtableViewError } from "@/lib/airtable/errors";
import { listAirtableRecords } from "@/lib/airtable/client";
import {
  buildLevelLadder,
  type LevelFields,
  mapLevelRecord,
} from "@/lib/data/levels";
import {
  buildTutorialCatalog,
  type TutorialContentKind,
  isPublishedTutorialMedia,
  type TutorialFields,
  mapTutorialRecord,
} from "@/lib/data/tutorials";
import {
  buildZoomMeetingCatalog,
  type ZoomMeetingFields,
  mapZoomMeetingRecord,
  type WeekFields as ZoomWeekFields,
} from "@/lib/data/zoom-meetings";
import {
  buildLeaderboardData,
  inferSeasonLabel,
  type EnrollmentLeaderboardFields,
} from "@/lib/data/leaderboard";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";
import type { LevelDefinition, LevelLadderData } from "@/types/levels";
import type { LeaderboardData } from "@/types/leaderboard";
import type { TutorialCatalogData, TutorialItem } from "@/types/tutorials";
import type { ZoomMeeting, ZoomMeetingCatalogData } from "@/types/zoom-meetings";
import {
  buildHomeworkCatalog,
  type FbcCurriculumFields,
  mapCurriculumToAssignment,
  type WeekFields,
} from "@/lib/data/homework";

/** Airtable table names — update as views and publish rules are finalized. */
export const AIRTABLE_TABLES = {
  enrollments: "Enrollments",
  weeklySummary: "Weekly Athlete Summary",
  xpEvents: "XP Events",
  levels: "Levels",
  achievements: "Achievements",
  homeworkCompletions: "Homework Completions",
  homeworkCurriculum: "FBC Curriculum - SYNC",
  weeks: "Weeks",
  tutorials: "Tutorials",
  zoomMeetings: "Zoom Meetings",
  videoFeedback: "Video Feedback",
} as const;

/** Enrollments fields used by the public leaderboard (see schema snapshot). */
export const LEADERBOARD_FIELDS = [
  "Full Athlete Name",
  "School Name Lookup",
  "Grade",
  "Current Level - Public Facing Display",
  "Level Sort Order - For Softr",
  "Athlete Headshot",
  "Lifetime XP Total",
  "Total Shots Counted",
  "School Year",
] as const;

const LEADERBOARD_VIEW = "Web - Leaderboard";
const LEADERBOARD_MAX_RECORDS = 200;
const LEADERBOARD_REVALIDATE_SECONDS = 120;

const HOMEWORK_VIEW = "Web - Homework Catalog";
const HOMEWORK_REVALIDATE_SECONDS = 300;
const HOMEWORK_PUBLISHED_FILTER = "{Published?} = 1";

const HOMEWORK_CATALOG_FIELDS = [
  "Assignment Full Name",
  "Assignment Full Name - Display",
  "Assignment Title",
  "Brief Description - Display",
  "Week",
  "Homework Number",
  "Assignment Number",
  "Order",
  "Book",
  "Book Abbreviation",
  "Assignment Topic",
  "Cover Images",
  "Published?",
] as const;

const HOMEWORK_DETAIL_FIELDS = [
  ...HOMEWORK_CATALOG_FIELDS,
  "Full Assignment Description",
  "Assignment Description",
  "Specific Steps",
  "Assignment Rationale",
  "Age Appropriate",
  "Docs",
  "URL",
  "URL Additional",
  "Grade Band",
] as const;

const WEEK_FIELDS = ["Week Name", "Start Date"] as const;

const CATALOG_REVALIDATE_SECONDS = 300;

const LEVELS_VIEW = "Web - Levels";
const LEVELS_ACTIVE_FILTER = "{Active?} = 1";
const LEVEL_FIELDS = [
  "Level Name",
  "Level Name with Color",
  "Cover Image",
  "XP Required (Cumulative)",
  "XP From Previous Level",
  "Previous Level",
  "Next Level",
  "Sort Order",
  "Rank",
  "Public Gate Criteria",
  "Active?",
] as const;

const TUTORIALS_VIEW = "Web - Tutorials Catalog";
const TUTORIALS_PUBLISH_FILTER =
  'AND({OK to Publish on Softr}, OR({Associated Program} = "", FIND("Shooting Challenge", ARRAYJOIN({Associated Program}))))';
const TUTORIAL_FIELDS = [
  "Name",
  "Link to Video",
  "Athlete",
  "Athlete Headshot - Lkp",
  "Thumbnail",
  "Website Image Resolved",
  "Tutorial Type",
  "Tutorial - Category",
  "Associated Program",
  "Brief Description",
  "Detailed Description",
  "OK to Publish on Softr",
  "Sort Order",
] as const;

const ZOOM_MEETINGS_VIEW = "Web - Zoom Meetings";
const ZOOM_MEETINGS_FILTER = "NOT({Meeting Status} = 'Cancelled')";
const ZOOM_MEETING_FIELDS = [
  "Meeting Name",
  "Cover Media",
  "Week",
  "Start Time",
  "End Time",
  "Brief Description",
  "Full Description",
  "Zoom Link",
  "Host Name",
  "Meeting Agenda",
  "Meeting Agenda Link",
  "Recording Link - Video",
  "Recording Link - Audio Only",
  "Meeting Summary",
  "Meeting Status",
] as const;

/** Fallback when the Web view is missing — mirrors view intent in docs/airtable-data-map.md. */
const LEADERBOARD_FALLBACK_FILTER = "AND({Active?}, {Lifetime XP Total} >= 0)";

/**
 * Public season leaderboard — active enrollments ranked level → XP → shots.
 * Prefer the `Web - Leaderboard` view when present; sort is applied in app code.
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.enrollments,
    maxRecords: LEADERBOARD_MAX_RECORDS,
    fields: [...LEADERBOARD_FIELDS],
    revalidateSeconds: LEADERBOARD_REVALIDATE_SECONDS,
  };

  let response: { records: Array<{ id: string; fields: EnrollmentLeaderboardFields }> };

  try {
    response = await listAirtableRecords<EnrollmentLeaderboardFields>({
      ...baseParams,
      view: LEADERBOARD_VIEW,
    });
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    response = await listAirtableRecords<EnrollmentLeaderboardFields>({
      ...baseParams,
      filterByFormula: LEADERBOARD_FALLBACK_FILTER,
    });
  }

  const seasonLabel = inferSeasonLabel(response.records);
  return buildLeaderboardData(response.records, seasonLabel);
}

async function listPublishedHomeworkRecords(): Promise<
  Array<{ id: string; fields: FbcCurriculumFields }>
> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.homeworkCurriculum,
    maxRecords: 200,
    fields: [...HOMEWORK_CATALOG_FIELDS],
    revalidateSeconds: HOMEWORK_REVALIDATE_SECONDS,
  };

  try {
    const response = await listAirtableRecords<FbcCurriculumFields>({
      ...baseParams,
      view: HOMEWORK_VIEW,
    });
    return response.records;
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    const response = await listAirtableRecords<FbcCurriculumFields>({
      ...baseParams,
      filterByFormula: HOMEWORK_PUBLISHED_FILTER,
      sort: [{ field: "Order", direction: "asc" as const }],
    });
    return response.records;
  }
}

async function listWeekRecords(): Promise<Array<{ id: string; fields: WeekFields }>> {
  const response = await listAirtableRecords<WeekFields>({
    tableName: AIRTABLE_TABLES.weeks,
    maxRecords: 100,
    fields: [...WEEK_FIELDS],
    revalidateSeconds: HOMEWORK_REVALIDATE_SECONDS,
  });
  return response.records;
}

/** Published homework catalog grouped by week (newest week first). */
export async function fetchHomeworkCatalog(): Promise<HomeworkCatalogData> {
  const [curriculumRecords, weekRecords] = await Promise.all([
    listPublishedHomeworkRecords(),
    listWeekRecords(),
  ]);

  return buildHomeworkCatalog(curriculumRecords, weekRecords);
}

function isAirtableRecordId(value: string): boolean {
  return /^rec[a-zA-Z0-9]{14}$/.test(value);
}

/** Single published homework assignment for the detail page. */
export async function fetchHomeworkAssignment(recordId: string): Promise<HomeworkAssignment | null> {
  if (!isAirtableRecordId(recordId)) return null;

  const [assignmentResponse, weekRecords] = await Promise.all([
    listAirtableRecords<FbcCurriculumFields>({
      tableName: AIRTABLE_TABLES.homeworkCurriculum,
      maxRecords: 1,
      fields: [...HOMEWORK_DETAIL_FIELDS],
      filterByFormula: `AND({Published?}, RECORD_ID()='${recordId}')`,
      revalidateSeconds: HOMEWORK_REVALIDATE_SECONDS,
    }),
    listWeekRecords(),
  ]);

  const record = assignmentResponse.records[0];
  if (!record) return null;

  const weekIndex = new Map(
    weekRecords.map((week) => [
      week.id,
      {
        name: String(week.fields["Week Name"] ?? "Week"),
        startDate:
          typeof week.fields["Start Date"] === "string" ? week.fields["Start Date"] : null,
      },
    ]),
  );

  return mapCurriculumToAssignment(record, weekIndex);
}

async function listActiveLevelRecords(): Promise<Array<{ id: string; fields: LevelFields }>> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.levels,
    maxRecords: 50,
    fields: [...LEVEL_FIELDS],
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  };

  try {
    const response = await listAirtableRecords<LevelFields>({
      ...baseParams,
      view: LEVELS_VIEW,
    });
    return response.records;
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    const response = await listAirtableRecords<LevelFields>({
      ...baseParams,
      filterByFormula: LEVELS_ACTIVE_FILTER,
      sort: [{ field: "Sort Order", direction: "asc" as const }],
    });
    return response.records;
  }
}

/** Active level ladder — highest tier first. */
export async function fetchLevelLadder(): Promise<LevelLadderData> {
  const records = await listActiveLevelRecords();
  return buildLevelLadder(records);
}

/** Single active level for the detail page. */
export async function fetchLevelDefinition(recordId: string): Promise<LevelDefinition | null> {
  if (!isAirtableRecordId(recordId)) return null;

  const response = await listAirtableRecords<LevelFields>({
    tableName: AIRTABLE_TABLES.levels,
    maxRecords: 1,
    fields: [...LEVEL_FIELDS],
    filterByFormula: `AND({Active?}, RECORD_ID()='${recordId}')`,
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  });

  const record = response.records[0];
  return record ? mapLevelRecord(record) : null;
}

async function listPublishedTutorialRecords(): Promise<
  Array<{ id: string; fields: TutorialFields }>
> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.tutorials,
    maxRecords: 200,
    fields: [...TUTORIAL_FIELDS],
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  };

  try {
    const response = await listAirtableRecords<TutorialFields>({
      ...baseParams,
      view: TUTORIALS_VIEW,
    });
    return response.records;
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    const response = await listAirtableRecords<TutorialFields>({
      ...baseParams,
      filterByFormula: TUTORIALS_PUBLISH_FILTER,
      sort: [{ field: "Sort Order", direction: "asc" as const }],
    });
    return response.records;
  }
}

/** Published tutorials for Shooting Challenge, grouped by category. */
export async function fetchTutorialCatalog(): Promise<TutorialCatalogData> {
  const records = await listPublishedTutorialRecords();
  const filtered = records.filter((record) => isPublishedTutorialMedia(record.fields, "tutorial"));
  return buildTutorialCatalog(filtered, "tutorial");
}

/** Published athlete shout-outs from the Tutorials table. */
export async function fetchShoutoutCatalog(): Promise<TutorialCatalogData> {
  const records = await listPublishedTutorialRecords();
  const filtered = records.filter((record) => isPublishedTutorialMedia(record.fields, "shoutout"));
  return buildTutorialCatalog(filtered, "shoutout");
}

/** Published FBC article book entries from the Tutorials table. */
export async function fetchArticleCatalog(): Promise<TutorialCatalogData> {
  const records = await listPublishedTutorialRecords();
  const filtered = records.filter((record) => isPublishedTutorialMedia(record.fields, "article"));
  return buildTutorialCatalog(filtered, "article");
}

async function fetchPublishedTutorialItem(
  recordId: string,
  kind: TutorialContentKind,
): Promise<TutorialItem | null> {
  if (!isAirtableRecordId(recordId)) return null;

  const response = await listAirtableRecords<TutorialFields>({
    tableName: AIRTABLE_TABLES.tutorials,
    maxRecords: 1,
    fields: [...TUTORIAL_FIELDS],
    filterByFormula: `AND({OK to Publish on Softr}, RECORD_ID()='${recordId}')`,
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  });

  const record = response.records[0];
  if (!record || !isPublishedTutorialMedia(record.fields, kind)) return null;
  return mapTutorialRecord(record);
}

/** Single published tutorial for the detail page. */
export async function fetchTutorialItem(recordId: string): Promise<TutorialItem | null> {
  return fetchPublishedTutorialItem(recordId, "tutorial");
}

/** Single published shout-out for the detail page. */
export async function fetchShoutoutItem(recordId: string): Promise<TutorialItem | null> {
  return fetchPublishedTutorialItem(recordId, "shoutout");
}

/** Single published article for the detail page. */
export async function fetchArticleItem(recordId: string): Promise<TutorialItem | null> {
  return fetchPublishedTutorialItem(recordId, "article");
}

async function listPublicZoomMeetingRecords(): Promise<
  Array<{ id: string; fields: ZoomMeetingFields }>
> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.zoomMeetings,
    maxRecords: 100,
    fields: [...ZOOM_MEETING_FIELDS],
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  };

  try {
    const response = await listAirtableRecords<ZoomMeetingFields>({
      ...baseParams,
      view: ZOOM_MEETINGS_VIEW,
    });
    return response.records;
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    const response = await listAirtableRecords<ZoomMeetingFields>({
      ...baseParams,
      filterByFormula: ZOOM_MEETINGS_FILTER,
      sort: [{ field: "Start Time", direction: "desc" as const }],
    });
    return response.records;
  }
}

/** Public zoom meetings grouped by challenge week. */
export async function fetchZoomMeetingCatalog(): Promise<ZoomMeetingCatalogData> {
  const [records, weeksResponse] = await Promise.all([
    listPublicZoomMeetingRecords(),
    listAirtableRecords<ZoomWeekFields>({
      tableName: AIRTABLE_TABLES.weeks,
      maxRecords: 100,
      fields: [...WEEK_FIELDS],
      revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
    }),
  ]);

  return buildZoomMeetingCatalog(records, weeksResponse.records);
}

/** Single public zoom meeting for the detail page. */
export async function fetchZoomMeeting(recordId: string): Promise<ZoomMeeting | null> {
  if (!isAirtableRecordId(recordId)) return null;

  const [response, weeksResponse] = await Promise.all([
    listAirtableRecords<ZoomMeetingFields>({
      tableName: AIRTABLE_TABLES.zoomMeetings,
      maxRecords: 1,
      fields: [...ZOOM_MEETING_FIELDS],
      filterByFormula: `AND(NOT({Meeting Status} = 'Cancelled'), RECORD_ID()='${recordId}')`,
      revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
    }),
    listAirtableRecords<ZoomWeekFields>({
      tableName: AIRTABLE_TABLES.weeks,
      maxRecords: 100,
      fields: [...WEEK_FIELDS],
      revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
    }),
  ]);

  const record = response.records[0];
  if (!record) return null;

  const weekIndex = new Map(
    weeksResponse.records.map((week) => [
      week.id,
      {
        name: String(week.fields["Week Name"] ?? "Week"),
        startDate:
          typeof week.fields["Start Date"] === "string" ? week.fields["Start Date"] : null,
      },
    ]),
  );

  return mapZoomMeetingRecord(record, weekIndex);
}
