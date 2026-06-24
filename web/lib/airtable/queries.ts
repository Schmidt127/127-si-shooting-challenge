/**
 * Domain-specific Airtable queries.
 * Add one function per page/feature; keep field names aligned with docs/airtable-data-map.md.
 */

import { listAirtableRecords } from "@/lib/airtable/client";
import {
  buildLeaderboardData,
  inferSeasonLabel,
  type EnrollmentLeaderboardFields,
} from "@/lib/data/leaderboard";
import type { LeaderboardData } from "@/types/leaderboard";

/** Airtable table names — update as views and publish rules are finalized. */
export const AIRTABLE_TABLES = {
  enrollments: "Enrollments",
  weeklySummary: "Weekly Athlete Summary",
  xpEvents: "XP Events",
  levels: "Levels",
  achievements: "Achievements",
  homeworkCompletions: "Homework Completions",
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
const LEADERBOARD_MAX_RECORDS = 100;
const LEADERBOARD_REVALIDATE_SECONDS = 120;

const ACTIVE_ENROLLMENTS_FILTER = "AND({Active?}, {Lifetime XP Total} >= 0)";

/**
 * Public season leaderboard — active enrollments sorted by lifetime XP.
 * Prefer the `Web - Leaderboard` view when present; falls back to formula + sort.
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
  } catch {
    response = await listAirtableRecords<EnrollmentLeaderboardFields>({
      ...baseParams,
      filterByFormula: ACTIVE_ENROLLMENTS_FILTER,
    });
  }

  const seasonLabel = inferSeasonLabel(response.records);
  return buildLeaderboardData(response.records, seasonLabel);
}
