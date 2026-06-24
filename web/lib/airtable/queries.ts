/**
 * Domain-specific Airtable queries.
 * Add one function per page/feature; keep field names aligned with docs/airtable-data-map.md.
 */

import { listAirtableRecords } from "@/lib/airtable/client";

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

/**
 * Example stub: leaderboard will read from Enrollments + rollups.
 * Not called by any page yet.
 */
export async function fetchLeaderboardStub() {
  // Placeholder filter — replace with "OK to Publish" / active enrollment view.
  return listAirtableRecords({
    tableName: AIRTABLE_TABLES.enrollments,
    maxRecords: 5,
    fields: ["Athlete Display Name", "Total XP", "Current Level"],
  });
}
