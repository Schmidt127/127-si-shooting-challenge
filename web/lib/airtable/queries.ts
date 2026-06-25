/**
 * Domain-specific Airtable queries.
 * Add one function per page/feature; keep field names aligned with docs/airtable-data-map.md.
 */

import { isMissingAirtableViewError } from "@/lib/airtable/errors";
import { listAirtableRecords } from "@/lib/airtable/client";
import {
  buildHomeworkCatalog,
  type FbcCurriculumFields,
  mapCurriculumToAssignment,
  type WeekFields,
} from "@/lib/data/homework";
import {
  buildLeaderboardData,
  inferSeasonLabel,
  type EnrollmentLeaderboardFields,
} from "@/lib/data/leaderboard";
import type { HomeworkAssignment, HomeworkCatalogData } from "@/types/homework";
import type { LeaderboardData } from "@/types/leaderboard";

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
  videoFeedback: "Video Feedback",
} as const;

/** Enrollments fields used by the public leaderboard (see schema snapshot). */
export const LEADERBOARD_FIELDS = [
  "Full Athlete Name",
  "School Name Lookup",
  "Grade",
  "Current Level - Public Facing Display",
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

/** Fallback when the Web view is missing — mirrors view intent in docs/airtable-data-map.md. */
const LEADERBOARD_FALLBACK_FILTER = "AND({Active?}, {Lifetime XP Total} >= 0)";

/**
 * Public season leaderboard — active enrollments sorted by lifetime XP.
 * Prefer the `Web - Leaderboard` view when present; falls back only on missing view.
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.enrollments,
    maxRecords: LEADERBOARD_MAX_RECORDS,
    fields: [...LEADERBOARD_FIELDS],
    sort: [{ field: "Lifetime XP Total", direction: "desc" as const }],
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
