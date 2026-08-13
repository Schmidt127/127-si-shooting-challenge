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
  requireEligibleLeaderboardRecords,
  type EnrollmentLeaderboardFields,
} from "@/lib/data/leaderboard";
import {
  buildPublicAthleteProfile,
  escapeAirtableString,
  isValidPublicSlug,
  mapPublicAchievements,
  mapRecentSubmissions,
  mapRecentXpEvents,
  mapWeeklySummaries,
  mergeRecentActivity,
  normalizeProfileSlug,
  type PublicAchievementDefFields,
  type PublicEnrollmentFields,
  type PublicLevelFields,
  type PublicSubmissionFields,
  type PublicUnlockFields,
  type PublicWasFields,
  type PublicXpEventFields,
} from "@/lib/data/public-athlete-profile";
import { asText, linkedRecordIds } from "@/lib/data/airtable-values";
import type { PublicAthleteProfile } from "@/types/public-athlete-profile";
import type { AchievementCatalogData } from "@/types/achievements";
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
import {
  buildAchievementCatalog,
  type AchievementFields,
} from "@/lib/data/achievements";
import {
  buildXpRuleCatalog,
  type XpRewardRuleFields,
  type XpRuleCatalogData,
} from "@/lib/data/xp-rules";

/** Airtable table names used by public queries + reserved for future dashboard/admin. */
export const AIRTABLE_TABLES = {
  enrollments: "Enrollments",
  weeklySummary: "Weekly Athlete Summary",
  xpEvents: "XP Events",
  levels: "Levels",
  achievements: "Achievements",
  achievementUnlocks: "Athlete Achievement Unlocks",
  submissions: "Submissions",
  homeworkCompletions: "Homework Completions",
  homeworkLibrary: "Homework Library",
  weeks: "Weeks",
  tutorials: "Tutorials",
  zoomMeetings: "Zoom Meetings",
  xpRewardRules: "XP Reward Rules",
  videoFeedback: "Video Feedback",
} as const;

/** Enrollments fields used by the public leaderboard (see schema snapshot). */
export const LEADERBOARD_FIELDS = [
  "Active?",
  "Athlete",
  "Athlete ID Lookup",
  "Program Instance",
  "Full Athlete Name",
  "School Name Lookup",
  "Grade",
  "Current Level",
  "Current Level - Public Facing Display",
  "Level Sort Order - For Softr",
  "Level Status",
  "Athlete Headshot",
  "Lifetime XP Total",
  "Total Shots Counted",
  "School Year",
  "Program Instance Name Only",
  "Public Profile Enabled",
  "Public Profile Slug",
] as const;

const LEADERBOARD_VIEW = "Web - Leaderboard";
const LEADERBOARD_REVALIDATE_SECONDS = 120;
const STANDINGS_CONFIG_TABLE = "Config";
const PROGRAM_INSTANCES_TABLE = "Program Instance - Synced";
const STANDINGS_CONFIG_FIELDS = ["Active School Year"] as const;
const PROGRAM_INSTANCE_SCOPE_FIELDS = [
  "Name - Program Instance",
  "School Year - Linked",
  "Record Id",
] as const;
const STANDINGS_LEVEL_FIELDS = ["Level Name", "Sort Order", "XP Required (Cumulative)", "Active?"] as const;

type StandingsConfigFields = { "Active School Year"?: unknown };
type ProgramInstanceScopeFields = {
  "Name - Program Instance"?: unknown;
  "School Year - Linked"?: unknown;
  "Record Id"?: unknown;
};
type StandingsLevelFields = {
  "Level Name"?: unknown;
  "Sort Order"?: unknown;
  "XP Required (Cumulative)"?: unknown;
  "Active?"?: unknown;
};

/**
 * Optional season scope for website queries.
 * Prefer Airtable Web views that already filter by active Program Instance.
 * When AIRTABLE_ACTIVE_SCHOOL_YEAR is set, fallback formulas also require that
 * School Year so prior-year Active? enrollments cannot leak into the public UI.
 */
function activeSchoolYearFilterClause(): string {
  const year = String(process.env.AIRTABLE_ACTIVE_SCHOOL_YEAR || "").trim();
  if (!year) return "";
  const escaped = year.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `{School Year} = "${escaped}"`;
}

function andFormula(...clauses: Array<string | false | null | undefined>): string {
  const parts = clauses.filter((c): c is string => typeof c === "string" && c.length > 0);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `AND(${parts.join(", ")})`;
}

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

const ACHIEVEMENTS_VIEW = "Web - Achievements";
const ACHIEVEMENTS_ACTIVE_FILTER = "AND({Active?}, {Visible?})";
const ACHIEVEMENT_FIELDS = [
  "Achievement Name",
  "Description",
  "Achievement Type",
  "Category",
  "Rarity",
  "Trigger Type",
  "Trigger Threshold",
  "Sort Order",
  "Badge Icon Name",
  "Repeatable?",
  "One-Time Unlock?",
  "Week-Specific?",
  "Active?",
  "Visible?",
] as const;
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

function exactText(value: unknown): string {
  return asText(value, "");
}

/**
 * Resolve the current season from authoritative configuration before reading the
 * public view. The Program Instance record id anchors the contract lookup;
 * Airtable's public REST linked-record response contains display values only, so
 * returned rows are additionally checked against this resolved canonical name.
 */
async function getStandingsScope(): Promise<{
  schoolYear: string;
  programInstanceName: string;
  activeLevelsByName: ReadonlyMap<string, { rank: number; xpRequired: number }>;
}> {
  const config = await listAirtableRecords<StandingsConfigFields>({
    tableName: STANDINGS_CONFIG_TABLE,
    fields: [...STANDINGS_CONFIG_FIELDS],
    revalidateSeconds: LEADERBOARD_REVALIDATE_SECONDS,
  });
  const schoolYears = [...new Set(
    config.records.map((record) => exactText(record.fields["Active School Year"])).filter(Boolean),
  )];
  if (schoolYears.length !== 1) {
    throw new Error(
      `Standings require exactly one Config Active School Year; found ${schoolYears.length}.`,
    );
  }

  const schoolYear = schoolYears[0];
  const expectedName = `Shooting Challenge | ${schoolYear}`;
  const programInstances = await listAirtableRecords<ProgramInstanceScopeFields>({
    tableName: PROGRAM_INSTANCES_TABLE,
    fields: [...PROGRAM_INSTANCE_SCOPE_FIELDS],
    filterByFormula: `AND({Name - Program Instance}=${JSON.stringify(expectedName)},{School Year - Linked}=${JSON.stringify(schoolYear)})`,
    revalidateSeconds: LEADERBOARD_REVALIDATE_SECONDS,
  });
  if (programInstances.records.length !== 1) {
    throw new Error(
      `Standings require exactly one current Shooting Challenge Program Instance for ${schoolYear}; found ${programInstances.records.length}.`,
    );
  }

  const programInstanceName = exactText(
    programInstances.records[0].fields["Name - Program Instance"],
  );
  if (!programInstanceName) {
    throw new Error("Current standings Program Instance has no canonical name.");
  }
  const levelResponse = await listAirtableRecords<StandingsLevelFields>({
    tableName: AIRTABLE_TABLES.levels,
    fields: [...STANDINGS_LEVEL_FIELDS],
    filterByFormula: "{Active?}=1",
    revalidateSeconds: LEADERBOARD_REVALIDATE_SECONDS,
  });
  const activeLevelsByName = new Map<string, { rank: number; xpRequired: number }>();
  for (const level of levelResponse.records) {
    const name = exactText(level.fields["Level Name"]);
    const rawRank = level.fields["Sort Order"];
    const rank = typeof rawRank === "number" ? rawRank : Number(rawRank);
    const rawThreshold = level.fields["XP Required (Cumulative)"];
    const xpRequired = typeof rawThreshold === "number" ? rawThreshold : Number(rawThreshold);
    if (!name || !Number.isFinite(rank) || rank < 0 || !Number.isFinite(xpRequired) || xpRequired < 0 || activeLevelsByName.has(name)) {
      throw new Error(`Standings found an invalid or duplicate active Level contract for "${name || level.id}".`);
    }
    activeLevelsByName.set(name, { rank, xpRequired });
  }
  if (activeLevelsByName.size === 0) throw new Error("Standings require at least one active Level.");
  return { schoolYear, programInstanceName, activeLevelsByName };
}

/**
 * Public season leaderboard — active enrollments ranked level → XP → shots.
 * The required `Web - Leaderboard` view is an audited public boundary. A missing
 * or renamed view fails closed; table-wide fallback could leak another season.
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const scope = await getStandingsScope();
  const baseParams = {
    tableName: AIRTABLE_TABLES.enrollments,
    fields: [...LEADERBOARD_FIELDS],
    revalidateSeconds: LEADERBOARD_REVALIDATE_SECONDS,
  };

  const response = await listAirtableRecords<EnrollmentLeaderboardFields>({
    ...baseParams,
    view: LEADERBOARD_VIEW,
  });
  const eligibleRecords = requireEligibleLeaderboardRecords(response.records, scope);
  const seasonLabel = inferSeasonLabel(eligibleRecords);
  return buildLeaderboardData(eligibleRecords, seasonLabel);
}

async function listPublishedHomeworkRecords(): Promise<
  Array<{ id: string; fields: FbcCurriculumFields }>
> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.homeworkLibrary,
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
      tableName: AIRTABLE_TABLES.homeworkLibrary,
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

async function listVisibleAchievementRecords(): Promise<
  Array<{ id: string; fields: AchievementFields }>
> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.achievements,
    maxRecords: 100,
    fields: [...ACHIEVEMENT_FIELDS],
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  };

  try {
    const response = await listAirtableRecords<AchievementFields>({
      ...baseParams,
      view: ACHIEVEMENTS_VIEW,
    });
    return response.records;
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    const response = await listAirtableRecords<AchievementFields>({
      ...baseParams,
      filterByFormula: ACHIEVEMENTS_ACTIVE_FILTER,
      sort: [{ field: "Sort Order", direction: "asc" as const }],
    });
    return response.records;
  }
}

/** Public achievement definitions — milestones, streaks, and unlocks. */
export async function fetchAchievementCatalog(): Promise<AchievementCatalogData> {
  const records = await listVisibleAchievementRecords();
  return buildAchievementCatalog(records);
}

const XP_RULES_VIEW = "Active Rules Only";
const XP_RULES_ACTIVE_FILTER = "{Active?} = 1";
const XP_RULE_FIELDS = [
  "Reward Rule",
  "Rule Key",
  "XP Source Label",
  "XP Amount",
  "Active?",
  "Rule Set",
  "Sort Order",
] as const;

async function listActiveXpRuleRecords(): Promise<
  Array<{ id: string; fields: XpRewardRuleFields }>
> {
  const baseParams = {
    tableName: AIRTABLE_TABLES.xpRewardRules,
    maxRecords: 200,
    fields: [...XP_RULE_FIELDS],
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  };

  try {
    const response = await listAirtableRecords<XpRewardRuleFields>({
      ...baseParams,
      view: XP_RULES_VIEW,
    });
    return response.records;
  } catch (error) {
    if (!isMissingAirtableViewError(error)) {
      throw error;
    }

    const response = await listAirtableRecords<XpRewardRuleFields>({
      ...baseParams,
      filterByFormula: XP_RULES_ACTIVE_FILTER,
    });
    return response.records;
  }
}

/**
 * Live XP Reward Rules configuration for the game manual.
 * The Airtable table is the runtime authority — the site never hardcodes amounts.
 */
export async function fetchXpRuleCatalog(): Promise<XpRuleCatalogData> {
  const records = await listActiveXpRuleRecords();
  return buildXpRuleCatalog(records);
}

/** Explicit allowlist for public athlete profile enrollment reads. */
export const PUBLIC_PROFILE_ENROLLMENT_FIELDS = [
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
  "XP Events",
] as const;

const PUBLIC_PROFILE_REVALIDATE_SECONDS = 120;
const PUBLIC_PROFILE_RECENT_SUBMISSIONS = 12;
const PUBLIC_PROFILE_RECENT_XP = 12;
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

const PUBLIC_XP_EVENT_FIELDS = [
  "Active?",
  "Active XP Points",
  "XP Reason Public",
  "XP Source",
  "Created",
] as const;

/**
 * Load one enabled public athlete profile by slug.
 * Returns null for missing, disabled, inactive, invalid, or duplicate slugs.
 * Duplicate enabled slugs are logged server-side and fail closed (null).
 */
export async function fetchPublicAthleteProfileBySlug(
  rawSlug: string,
): Promise<PublicAthleteProfile | null> {
  const slug = normalizeProfileSlug(rawSlug);
  if (!isValidPublicSlug(slug)) return null;

  const escaped = escapeAirtableString(slug);
  const schoolYearClause = activeSchoolYearFilterClause();
  const filterByFormula = andFormula(
    "{Public Profile Enabled}=1",
    "{Active?}",
    `LOWER({Public Profile Slug})=LOWER("${escaped}")`,
    schoolYearClause
  );

  const enrollmentResponse = await listAirtableRecords<PublicEnrollmentFields>({
    tableName: AIRTABLE_TABLES.enrollments,
    maxRecords: 5,
    fields: [...PUBLIC_PROFILE_ENROLLMENT_FIELDS],
    filterByFormula,
    revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
  });

  if (enrollmentResponse.records.length === 0) {
    return null;
  }

  if (enrollmentResponse.records.length > 1) {
    console.error(
      `[public-athlete-profile] Duplicate enabled Public Profile Slug "${slug}" (${enrollmentResponse.records.length} enrollments` +
        `${schoolYearClause ? ` after School Year filter` : ""}). ` +
        `Do not select Enrollment by Athlete alone — ensure one Active enrollment per Program Instance/slug. Failing closed.`
    );
    return null;
  }

  const enrollment = enrollmentResponse.records[0];
  const fields = enrollment.fields;

  const nextLevelIds = linkedRecordIds(fields["Next Level"]);
  const nextLevelId = nextLevelIds[0] ?? null;
  const submissionIds = linkedRecordIds(fields.Submissions).slice(0, 40);
  const wasIds = linkedRecordIds(fields["Weekly Athlete Summary"]).slice(0, 20);
  const unlockIds = linkedRecordIds(fields["Athlete Achievement Unlocks"]).slice(0, 50);
  const xpIds = linkedRecordIds(fields["XP Events"]).slice(0, 40);

  function recordIdOrFilter(ids: string[]): string | null {
    if (ids.length === 0) return null;
    if (ids.length === 1) return `RECORD_ID()="${ids[0]}"`;
    return `OR(${ids.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
  }

  const submissionFilter = recordIdOrFilter(submissionIds);
  const wasFilter = recordIdOrFilter(wasIds);
  const unlockFilter = recordIdOrFilter(unlockIds);
  const xpFilter = recordIdOrFilter(xpIds);

  const [
    submissionResponse,
    wasResponse,
    unlockResponse,
    xpResponse,
    leaderboard,
    nextLevelResponse,
  ] = await Promise.all([
    submissionFilter
      ? listAirtableRecords<PublicSubmissionFields>({
          tableName: AIRTABLE_TABLES.submissions,
          maxRecords: PUBLIC_PROFILE_RECENT_SUBMISSIONS,
          fields: [...PUBLIC_SUBMISSION_FIELDS],
          filterByFormula: submissionFilter,
          sort: [{ field: "Activity Date", direction: "desc" }],
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicSubmissionFields }> }),
    wasFilter
      ? listAirtableRecords<PublicWasFields>({
          tableName: AIRTABLE_TABLES.weeklySummary,
          maxRecords: PUBLIC_PROFILE_WEEKLY_LIMIT,
          fields: [...PUBLIC_WAS_FIELDS],
          filterByFormula: wasFilter,
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicWasFields }> }),
    unlockFilter
      ? listAirtableRecords<PublicUnlockFields>({
          tableName: AIRTABLE_TABLES.achievementUnlocks,
          maxRecords: 50,
          fields: [...PUBLIC_UNLOCK_FIELDS],
          filterByFormula: unlockFilter,
          sort: [{ field: "Date Unlocked", direction: "desc" }],
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicUnlockFields }> }),
    xpFilter
      ? listAirtableRecords<PublicXpEventFields>({
          tableName: AIRTABLE_TABLES.xpEvents,
          maxRecords: PUBLIC_PROFILE_RECENT_XP,
          fields: [...PUBLIC_XP_EVENT_FIELDS],
          filterByFormula: xpFilter,
          sort: [{ field: "Created", direction: "desc" }],
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicXpEventFields }> }),
    fetchLeaderboard().catch(() => null),
    nextLevelId
      ? listAirtableRecords<PublicLevelFields>({
          tableName: AIRTABLE_TABLES.levels,
          maxRecords: 1,
          fields: ["Level Name", "Level Name with Color"],
          filterByFormula: `RECORD_ID()="${nextLevelId}"`,
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicLevelFields }> }),
  ]);

  const countedSubmissions = submissionResponse.records.filter((record) => {
    const counted = record.fields["Count This Submission?"];
    return counted === 1 || counted === true || Number(counted) === 1;
  });

  const visibleUnlocks = unlockResponse.records.filter(
    (record) =>
      (record.fields["Active?"] === true || record.fields["Active?"] === 1) &&
      (record.fields["Visible?"] === true ||
        record.fields["Visible?"] === 1 ||
        (Array.isArray(record.fields["Visible?"]) &&
          record.fields["Visible?"].some((v) => v === true || v === 1))),
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
          filterByFormula:
            achievementIds.length === 1
              ? `RECORD_ID()="${achievementIds[0]}"`
              : `OR(${achievementIds.map((id) => `RECORD_ID()="${id}"`).join(",")})`,
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicAchievementDefFields }> }),
    weekIds.length
      ? listAirtableRecords<{ "Week Name"?: unknown }>({
          tableName: AIRTABLE_TABLES.weeks,
          maxRecords: Math.min(50, weekIds.length + 5),
          fields: ["Week Name"],
          filterByFormula:
            weekIds.length === 1
              ? `RECORD_ID()="${weekIds[0]}"`
              : `OR(${weekIds.map((id) => `RECORD_ID()="${id}"`).join(",")})`,
          revalidateSeconds: PUBLIC_PROFILE_REVALIDATE_SECONDS,
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

  const displayName = asText(fields["Full Athlete Name"], "");
  const rank =
    leaderboard?.entries.find(
      (entry) =>
        entry.publicProfileSlug === slug ||
        (displayName && entry.displayName === displayName),
    )?.rank ?? null;

  const recentActivity = mergeRecentActivity(
    mapRecentSubmissions(countedSubmissions),
    mapRecentXpEvents(xpResponse.records),
    12,
  );

  return buildPublicAthleteProfile({
    slug,
    fields,
    rank,
    nextLevelName: nextLevelName === "—" ? null : nextLevelName,
    recentActivity,
    weekly: mapWeeklySummaries(wasResponse.records, weekNameById),
    achievements: mapPublicAchievements(visibleUnlocks, defsById),
  });
}
