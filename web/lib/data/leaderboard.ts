import type { LeaderboardData, LeaderboardEntry } from "@/types/leaderboard";

import { asNumber, asText } from "./airtable-values";

/** Raw Enrollments fields consumed by the public leaderboard. */
export type EnrollmentLeaderboardFields = {
  "Full Athlete Name"?: unknown;
  "School Name Lookup"?: unknown;
  Grade?: unknown;
  "Current Level - Public Facing Display"?: unknown;
  "Lifetime XP Total"?: unknown;
  "Total Shots Counted"?: unknown;
  "School Year"?: unknown;
};

export function mapEnrollmentToLeaderboardEntry(
  record: { id: string; fields: EnrollmentLeaderboardFields },
  rank: number,
): LeaderboardEntry {
  const fields = record.fields;

  return {
    id: record.id,
    rank,
    displayName: asText(fields["Full Athlete Name"], "Unknown Athlete"),
    school: asText(fields["School Name Lookup"]),
    grade: asText(fields.Grade),
    level: asText(fields["Current Level - Public Facing Display"]),
    xp: asNumber(fields["Lifetime XP Total"]),
    totalShots: asNumber(fields["Total Shots Counted"]),
  };
}

export function buildLeaderboardData(
  records: Array<{ id: string; fields: EnrollmentLeaderboardFields }>,
  seasonLabel = "2025–2026 Season",
): LeaderboardData {
  const entries = records.map((record, index) =>
    mapEnrollmentToLeaderboardEntry(record, index + 1),
  );

  return {
    entries,
    updatedAt: new Date().toISOString(),
    seasonLabel,
  };
}

export function inferSeasonLabel(
  records: Array<{ fields: EnrollmentLeaderboardFields }>,
): string {
  const schoolYear = records
    .map((record) => asText(record.fields["School Year"], ""))
    .find((year) => year && year !== "—");

  return schoolYear ? `${schoolYear} Season` : "Current Season";
}
