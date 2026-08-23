/**
 * Public athlete profile Airtable queries — shell resolution and segment loading.
 */

import { listAirtableRecords } from "@/lib/airtable/client";
import {
  PROFILE_CACHE_TTL_SECONDS,
  cachedSegment,
  leaderboardCacheKey,
  profileShellCacheKey,
  readCacheOutcome,
} from "@/lib/airtable/cache";
import { logAirtableRequest } from "@/lib/airtable/request-log";
import { andFormula, activeSchoolYearFilterClause } from "@/lib/airtable/formula";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import {
  asBoolean,
  asText,
  linkedRecordIds,
} from "@/lib/data/airtable-values";
import {
  buildPublicAthleteProfile,
  escapeAirtableString,
  isValidPublicSlug,
  mapPublicAchievements,
  mapRecentSubmissions,
  mapWeeklySummaries,
  normalizeProfileSlug,
  type PublicAchievementDefFields,
  type PublicEnrollmentFields,
  type PublicLevelFields,
  type PublicSubmissionFields,
  type PublicUnlockFields,
  type PublicWasFields,
} from "@/lib/data/public-athlete-profile";
import { recordIdOrFilter } from "@/lib/data/xp-activity";
import type { PublicAthleteProfile } from "@/types/public-athlete-profile";

const AIRTABLE_TABLES = {
  enrollments: PUBLIC_AIRTABLE_TABLES.enrollments.name,
  weeklySummary: PUBLIC_AIRTABLE_TABLES.weeklySummary.name,
  achievements: PUBLIC_AIRTABLE_TABLES.achievements.name,
  achievementUnlocks: PUBLIC_AIRTABLE_TABLES.achievementUnlocks.name,
  submissions: PUBLIC_AIRTABLE_TABLES.submissions.name,
  levels: PUBLIC_AIRTABLE_TABLES.levels.name,
  weeks: PUBLIC_AIRTABLE_TABLES.weeks.name,
} as const;

/** Explicit allowlist for public athlete profile enrollment reads. */
const PUBLIC_PROFILE_ENROLLMENT_FIELDS = [
  "Full Athlete Name",
  "School Name Lookup",
  "Grade",
  "School Year",
  "Athlete Headshot",
  "Public Profile Enabled",
  "Public Profile Slug",
  "Active?",
  "Current Level - Public Facing Display",
  "Level Sort Order - For Softr",
  "Lifetime XP Total",
  "XP Progress in Current Level",
  "XP Needed for Next Level",
  "Current Level XP Required",
  "Next Level XP Required",
  "Next Level",
  "Total Shots Counted",
  "Total Makes Submitted",
  "Overall FG Attempted",
  "Overall FG Made",
  "Overall FG %",
  "Total 2PT Attempted",
  "Total 2PT Made",
  "Overall 2PT %",
  "Total 3PT Attempted",
  "Total 3PT Made",
  "Overall 3PT %",
  "Total FT Attempted",
  "Total FT Made",
  "Overall FT %",
  "Total Submissions",
  "Current Shooting Streak",
  "Current Shooting Streak As Of",
  "Current Shooting Streak Status",
  "Longest Streak Days",
  "Target Goal Shots",
  "Goal Met?",
  "Public Progression Status",
  "Public Gate Missing Reason",
  "Public Missing Submissions",
  "Public Missing Homework",
  "Public Missing Videos",
  "Public Missing Zoom",
  "Public Missing Streak",
  "Program Instance Name Only",
  "Submissions",
  "Weekly Athlete Summary",
  "Athlete Achievement Unlocks",
] as const;

const PUBLIC_PROFILE_RECENT_SUBMISSIONS = 12;
const PUBLIC_PROFILE_WEEKLY_LIMIT = 8;

const PUBLIC_SUBMISSION_FIELDS = [
  "Activity Date",
  "Total Shots Counted",
  "Total Makes Counted",
  "Submission Stat Mode",
  "Count This Submission?",
] as const;

const PUBLIC_WAS_FIELDS = [
  "Weekly Email Week Label",
  "Total Shots This Week",
  "Days Logged This Week",
  "XP Earned This Week",
  "Goal Completion %",
  "Momentum Status",
  "Homework Completed?",
  "Perfect Week Eligible?",
  "Perfect Week Unlock",
  "Week",
] as const;

const PUBLIC_UNLOCK_FIELDS = [
  "Active?",
  "Visible?",
  "Achievement",
  "Achievement Type",
  "Category",
  "Rarity",
  "Date Unlocked",
  "XP Awarded",
  "Trigger Value",
  "Shot Milestone",
] as const;

export type PublicEnrollmentResolution =
  | {
      status: "ok";
      slug: string;
      enrollment: { id: string; fields: PublicEnrollmentFields };
    }
  | { status: "not_found"; slug: string }
  | { status: "error"; slug: string; message: string };

export async function resolvePublicEnrollmentBySlug(
  rawSlug: string,
): Promise<PublicEnrollmentResolution> {
  const slug = normalizeProfileSlug(rawSlug);
  if (!isValidPublicSlug(slug)) {
    return { status: "not_found", slug: String(rawSlug || "").trim() || "(empty)" };
  }

  const escaped = escapeAirtableString(slug);
  const schoolYearClause = activeSchoolYearFilterClause();
  const filterByFormula = andFormula(
    "{Public Profile Enabled}=1",
    "{Active?}",
    `LOWER({Public Profile Slug})=LOWER("${escaped}")`,
    schoolYearClause,
  );

  const started = Date.now();
  const enrollmentResponse = await listAirtableRecords<PublicEnrollmentFields>({
    tableName: AIRTABLE_TABLES.enrollments,
    maxRecords: 5,
    fields: [...PUBLIC_PROFILE_ENROLLMENT_FIELDS],
    filterByFormula,
    revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
  });

  logAirtableRequest({
    scope: "airtable-profile",
    table: "Enrollments",
    durationMs: Date.now() - started,
    records: enrollmentResponse.records.length,
    cache: "miss",
  });

  if (enrollmentResponse.records.length === 0) {
    return { status: "not_found", slug };
  }

  if (enrollmentResponse.records.length > 1) {
    console.error(
      `[public-athlete-profile] Duplicate enabled Public Profile Slug "${slug}" (${enrollmentResponse.records.length} enrollments` +
        `${schoolYearClause ? ` after School Year filter` : ""}). Failing closed.`,
    );
    return { status: "not_found", slug };
  }

  return {
    status: "ok",
    slug,
    enrollment: enrollmentResponse.records[0],
  };
}

async function fetchCachedLeaderboard() {
  const { fetchLeaderboard } = await import("@/lib/airtable/queries");
  const key = leaderboardCacheKey();
  return cachedSegment(key, ["leaderboard:season"], PROFILE_CACHE_TTL_SECONDS, fetchLeaderboard);
}

export async function resolveAthleteRank(
  slug: string,
  displayName: string,
): Promise<number | null> {
  try {
    const leaderboard = await fetchCachedLeaderboard();
    return (
      leaderboard.entries.find(
        (entry) =>
          entry.publicProfileSlug === slug ||
          (displayName && entry.displayName === displayName),
      )?.rank ?? null
    );
  } catch {
    return null;
  }
}

export async function fetchPublicAthleteProfileShellBySlug(
  rawSlug: string,
): Promise<PublicAthleteProfile | null> {
  const slug = normalizeProfileSlug(rawSlug);
  if (!isValidPublicSlug(slug)) return null;

  const cacheKey = profileShellCacheKey(slug);
  const profile = await cachedSegment(
    cacheKey,
    ["profile-shell", `athlete:${slug}`],
    PROFILE_CACHE_TTL_SECONDS,
    async () => buildPublicAthleteProfileShell(slug),
  );

  logAirtableRequest({
    scope: "airtable-profile",
    table: "Profile Shell",
    durationMs: 0,
    records: profile ? 1 : 0,
    cache: readCacheOutcome(cacheKey),
  });

  return profile;
}

async function buildPublicAthleteProfileShell(slug: string): Promise<PublicAthleteProfile | null> {
  const resolution = await resolvePublicEnrollmentBySlug(slug);
  if (resolution.status !== "ok") return null;

  const enrollment = resolution.enrollment;
  const fields = enrollment.fields;
  const nextLevelIds = linkedRecordIds(fields["Next Level"]);
  const nextLevelId = nextLevelIds[0] ?? null;
  const submissionIds = linkedRecordIds(fields.Submissions).slice(0, PUBLIC_PROFILE_RECENT_SUBMISSIONS);
  const wasIds = linkedRecordIds(fields["Weekly Athlete Summary"]).slice(0, 20);
  const unlockIds = linkedRecordIds(fields["Athlete Achievement Unlocks"]).slice(0, 50);

  const submissionFilter = recordIdOrFilter(submissionIds);
  const wasFilter = recordIdOrFilter(wasIds);
  const unlockFilter = recordIdOrFilter(unlockIds);

  const [submissionResponse, wasResponse, unlockResponse, nextLevelResponse, rank] =
    await Promise.all([
      submissionFilter
        ? listAirtableRecords<PublicSubmissionFields>({
            tableName: AIRTABLE_TABLES.submissions,
            maxRecords: PUBLIC_PROFILE_RECENT_SUBMISSIONS,
            fields: [...PUBLIC_SUBMISSION_FIELDS],
            filterByFormula: submissionFilter,
            sort: [{ field: "Activity Date", direction: "desc" }],
            revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicSubmissionFields }> }),
      wasFilter
        ? listAirtableRecords<PublicWasFields>({
            tableName: AIRTABLE_TABLES.weeklySummary,
            maxRecords: PUBLIC_PROFILE_WEEKLY_LIMIT,
            fields: [...PUBLIC_WAS_FIELDS],
            filterByFormula: wasFilter,
            revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicWasFields }> }),
      unlockFilter
        ? listAirtableRecords<PublicUnlockFields>({
            tableName: AIRTABLE_TABLES.achievementUnlocks,
            maxRecords: 50,
            fields: [...PUBLIC_UNLOCK_FIELDS],
            filterByFormula: unlockFilter,
            sort: [{ field: "Date Unlocked", direction: "desc" }],
            revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicUnlockFields }> }),
      nextLevelId
        ? listAirtableRecords<PublicLevelFields>({
            tableName: AIRTABLE_TABLES.levels,
            maxRecords: 1,
            fields: ["Level Name", "Level Name with Color"],
            filterByFormula: `RECORD_ID()="${nextLevelId}"`,
            revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicLevelFields }> }),
      resolveAthleteRank(slug, asText(fields["Full Athlete Name"], "")),
    ]);

  const countedSubmissions = submissionResponse.records.filter((record) =>
    asBoolean(record.fields["Count This Submission?"]),
  );

  const visibleUnlocks = unlockResponse.records.filter(
    (record) => asBoolean(record.fields["Active?"]) && asBoolean(record.fields["Visible?"]),
  );

  const achievementIds = [
    ...new Set(visibleUnlocks.flatMap((record) => linkedRecordIds(record.fields.Achievement))),
  ];

  const weekIds = [
    ...new Set(wasResponse.records.flatMap((record) => linkedRecordIds(record.fields.Week))),
  ];

  const [achievementDefs, weekRecords] = await Promise.all([
    achievementIds.length
      ? listAirtableRecords<PublicAchievementDefFields>({
          tableName: AIRTABLE_TABLES.achievements,
          maxRecords: Math.min(100, achievementIds.length + 5),
          fields: [
            "Achievement Name",
            "Badge Icon Name",
            "Achievement Type",
            "Category",
            "Rarity",
            "Active?",
            "Visible?",
          ],
          filterByFormula: recordIdOrFilter(achievementIds) ?? undefined,
          revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicAchievementDefFields }> }),
    weekIds.length
      ? listAirtableRecords<{ "Week Name"?: unknown }>({
          tableName: AIRTABLE_TABLES.weeks,
          maxRecords: Math.min(50, weekIds.length + 5),
          fields: ["Week Name"],
          filterByFormula: recordIdOrFilter(weekIds) ?? undefined,
          revalidateSeconds: PROFILE_CACHE_TTL_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: { "Week Name"?: unknown } }> }),
  ]);

  const defsById = new Map(
    achievementDefs.records.map((record) => {
      const name = asText(record.fields["Achievement Name"], "");
      return [
        record.id,
        {
          name,
          badgeIconName: asText(record.fields["Badge Icon Name"], "") || null,
        },
      ] as const;
    }),
  );

  const weekNameById = new Map(
    weekRecords.records.map((record) => [
      record.id,
      asText(record.fields["Week Name"], "Week"),
    ]),
  );

  const nextLevelFields = nextLevelResponse.records[0]?.fields;
  const nextLevelName =
    asText(nextLevelFields?.["Level Name with Color"], "") ||
    asText(nextLevelFields?.["Level Name"], "") ||
    null;

  return buildPublicAthleteProfile({
    slug,
    fields,
    rank,
    nextLevelName: nextLevelName === "—" ? null : nextLevelName,
    recentActivity: mapRecentSubmissions(countedSubmissions),
    weekly: mapWeeklySummaries(wasResponse.records, weekNameById),
    achievements: mapPublicAchievements(visibleUnlocks, defsById),
  });
}
