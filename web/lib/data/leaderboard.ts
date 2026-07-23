import type { LeaderboardData, LeaderboardEntry } from "@/types/leaderboard";

import { asNumber, asText } from "./airtable-values";
import { mapAttachments } from "./homework";

/** Raw Enrollments fields consumed by the public leaderboard. */
export type EnrollmentLeaderboardFields = {
  "Full Athlete Name"?: unknown;
  "School Name Lookup"?: unknown;
  Grade?: unknown;
  "Current Level - Public Facing Display"?: unknown;
  "Level Sort Order - For Softr"?: unknown;
  "Athlete Headshot"?: unknown;
  "Lifetime XP Total"?: unknown;
  "Total Shots Counted"?: unknown;
  "School Year"?: unknown;
};
export type LeaderboardSortKeys = {
  levelSortOrder: number;
  xp: number;
  totalShots: number;
};

export function getLeaderboardSortKeys(fields: EnrollmentLeaderboardFields): LeaderboardSortKeys {
  return {
    levelSortOrder: asNumber(fields["Level Sort Order - For Softr"]),
    xp: asNumber(fields["Lifetime XP Total"]),
    totalShots: asNumber(fields["Total Shots Counted"]),
  };
}

/** Rank by level (desc), then XP (desc), then total shots (desc). */
export function compareLeaderboardSortKeys(a: LeaderboardSortKeys, b: LeaderboardSortKeys): number {
  if (b.levelSortOrder !== a.levelSortOrder) return b.levelSortOrder - a.levelSortOrder;
  if (b.xp !== a.xp) return b.xp - a.xp;
  if (b.totalShots !== a.totalShots) return b.totalShots - a.totalShots;
  return 0;
}

export function sortLeaderboardRecords<
  T extends { id: string; fields: EnrollmentLeaderboardFields },
>(records: T[]): T[] {
  return [...records].sort((left, right) => {
    const byKeys = compareLeaderboardSortKeys(
      getLeaderboardSortKeys(left.fields),
      getLeaderboardSortKeys(right.fields),
    );
    if (byKeys !== 0) return byKeys;

    /* Deterministic tie order across fetches: name, then record id. */
    const byName = asText(left.fields["Full Athlete Name"], "").localeCompare(
      asText(right.fields["Full Athlete Name"], ""),
    );
    if (byName !== 0) return byName;
    return left.id.localeCompare(right.id);
  });
}

export function mapEnrollmentToLeaderboardEntry(
  record: { id: string; fields: EnrollmentLeaderboardFields },
  rank: number,
): LeaderboardEntry {
  const fields = record.fields;
  const sortKeys = getLeaderboardSortKeys(fields);
  const headshot = mapAttachments(fields["Athlete Headshot"]);

  return {
    id: record.id,
    rank,
    displayName: asText(fields["Full Athlete Name"], "Unknown Athlete"),
    school: asText(fields["School Name Lookup"]),
    grade: asText(fields.Grade),
    level: asText(fields["Current Level - Public Facing Display"]),
    levelSortOrder: sortKeys.levelSortOrder,
    headshot: headshot[0] ?? null,
    xp: sortKeys.xp,
    totalShots: sortKeys.totalShots,
  };
}

export function buildLeaderboardData(
  records: Array<{ id: string; fields: EnrollmentLeaderboardFields }>,
  seasonLabel = "2025–2026 Season",
): LeaderboardData {
  const sorted = sortLeaderboardRecords(records);
  const entries = sorted.map((record, index) =>
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
