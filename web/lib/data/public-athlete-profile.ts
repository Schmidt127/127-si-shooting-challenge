/**
 * Map allowlisted Airtable enrollment + related public rows → PublicAthleteProfile.
 * Never include private fields or Airtable record IDs in the returned model.
 */

import {
  asBoolean,
  asOptionalDateKey,
  asOptionalNumber,
  asOptionalPercentRatio,
  asText,
  linkedRecordIds,
  toAirtableDateKey,
} from "@/lib/data/airtable-values";
import { parseWeekNumber } from "@/lib/data/homework";
import { mapAttachments } from "@/lib/data/homework";
import type {
  PublicAchievement,
  PublicAchievementGroup,
  PublicActivityItem,
  PublicAthleteProfile,
  PublicProgression,
  PublicShootingSplit,
  PublicShootingStats,
  PublicWeeklySummary,
} from "@/types/public-athlete-profile";
import type { XpEventSummary } from "@/types/xp";
import { formatXpSourceLabel } from "@/lib/formatters";

export type PublicEnrollmentFields = {
  "Full Athlete Name"?: unknown;
  "School Name Lookup"?: unknown;
  Grade?: unknown;
  "School Year"?: unknown;
  "Athlete Headshot"?: unknown;
  "Public Profile Enabled"?: unknown;
  "Public Profile Slug"?: unknown;
  "Active?"?: unknown;
  "Current Level - Public Facing Display"?: unknown;
  "Level Sort Order - For Softr"?: unknown;
  "Lifetime XP Total"?: unknown;
  "XP Progress in Current Level"?: unknown;
  "XP Needed for Next Level"?: unknown;
  "Current Level XP Required"?: unknown;
  "Next Level XP Required"?: unknown;
  "Next Level"?: unknown;
  "Total Shots Counted"?: unknown;
  "Total Makes Submitted"?: unknown;
  "Overall FG Attempted"?: unknown;
  "Overall FG Made"?: unknown;
  "Overall FG %"?: unknown;
  "Total 2PT Attempted"?: unknown;
  "Total 2PT Made"?: unknown;
  "Overall 2PT %"?: unknown;
  "Total 3PT Attempted"?: unknown;
  "Total 3PT Made"?: unknown;
  "Overall 3PT %"?: unknown;
  "Total FT Attempted"?: unknown;
  "Total FT Made"?: unknown;
  "Overall FT %"?: unknown;
  "Total Submissions"?: unknown;
  "Current Shooting Streak"?: unknown;
  "Current Shooting Streak As Of"?: unknown;
  "Current Shooting Streak Status"?: unknown;
  "Longest Streak Days"?: unknown;
  "Target Goal Shots"?: unknown;
  "Goal Met?"?: unknown;
  "Public Progression Status"?: unknown;
  "Public Gate Missing Reason"?: unknown;
  "Public Missing Submissions"?: unknown;
  "Public Missing Homework"?: unknown;
  "Public Missing Videos"?: unknown;
  "Public Missing Zoom"?: unknown;
  "Public Missing Streak"?: unknown;
  "Program Instance Name Only"?: unknown;
  /** Server-only link ids — never serialized to the public model. */
  Submissions?: unknown;
  "Weekly Athlete Summary"?: unknown;
  "Athlete Achievement Unlocks"?: unknown;
  "XP Events"?: unknown;
};

export type PublicSubmissionFields = {
  "Activity Date"?: unknown;
  "Total Shots Counted"?: unknown;
  "Total Makes Counted"?: unknown;
  "Submission Stat Mode"?: unknown;
  "Count This Submission?"?: unknown;
};

export type PublicWasFields = {
  "Weekly Email Week Label"?: unknown;
  "Total Shots This Week"?: unknown;
  "Days Logged This Week"?: unknown;
  "XP Earned This Week"?: unknown;
  "Goal Completion %"?: unknown;
  "Momentum Status"?: unknown;
  "Homework Completed?"?: unknown;
  "Perfect Week Eligible?"?: unknown;
  "Perfect Week Unlock"?: unknown;
  Week?: unknown;
};

export type PublicUnlockFields = {
  "Active?"?: unknown;
  "Visible?"?: unknown;
  Achievement?: unknown;
  "Achievement Type"?: unknown;
  Category?: unknown;
  Rarity?: unknown;
  "Date Unlocked"?: unknown;
  "XP Awarded"?: unknown;
  "Trigger Value"?: unknown;
  "Shot Milestone"?: unknown;
};

export type PublicXpEventFields = {
  "Active?"?: unknown;
  "Active XP Points"?: unknown;
  "XP Reason Public"?: unknown;
  "XP Source"?: unknown;
  "XP Activity Date"?: unknown;
  Created?: unknown;
};

export type PublicAchievementDefFields = {
  "Achievement Name"?: unknown;
  "Badge Icon Name"?: unknown;
  "Achievement Type"?: unknown;
  Category?: unknown;
  Rarity?: unknown;
  "Active?"?: unknown;
  "Visible?"?: unknown;
};

export type PublicLevelFields = {
  "Level Name"?: unknown;
  "Level Name with Color"?: unknown;
};

export function normalizeProfileSlug(slug: string): string {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidPublicSlug(slug: string): boolean {
  const cleaned = normalizeProfileSlug(slug);
  return Boolean(cleaned) && cleaned.length <= 80 && !cleaned.startsWith("rec");
}

function shootingSplit(
  attempts: number | null,
  makes: number | null,
  percent: number | null,
): PublicShootingSplit {
  const available = attempts != null && attempts > 0;
  return {
    attempts,
    makes: available ? makes : null,
    percent: available ? percent : null,
    available,
  };
}

function mapShooting(fields: PublicEnrollmentFields): PublicShootingStats {
  const twoAttempts = asOptionalNumber(fields["Total 2PT Attempted"]);
  const threeAttempts = asOptionalNumber(fields["Total 3PT Attempted"]);
  const ftAttempts = asOptionalNumber(fields["Total FT Attempted"]);
  const fgAttempts = asOptionalNumber(fields["Overall FG Attempted"]);

  const two = shootingSplit(
    twoAttempts,
    asOptionalNumber(fields["Total 2PT Made"]),
    asOptionalPercentRatio(fields["Overall 2PT %"]),
  );
  const three = shootingSplit(
    threeAttempts,
    asOptionalNumber(fields["Total 3PT Made"]),
    asOptionalPercentRatio(fields["Overall 3PT %"]),
  );
  const ft = shootingSplit(
    ftAttempts,
    asOptionalNumber(fields["Total FT Made"]),
    asOptionalPercentRatio(fields["Overall FT %"]),
  );
  const overallFg = shootingSplit(
    fgAttempts,
    asOptionalNumber(fields["Overall FG Made"]),
    asOptionalPercentRatio(fields["Overall FG %"]),
  );

  const hasDetailedSplits = two.available || three.available || ft.available || overallFg.available;

  return {
    totalShots: asOptionalNumber(fields["Total Shots Counted"]) ?? 0,
    totalMakes: asOptionalNumber(fields["Total Makes Submitted"]),
    overallFg,
    twoPoint: two,
    threePoint: three,
    freeThrow: ft,
    hasDetailedSplits,
  };
}

function collectMissing(fields: PublicEnrollmentFields): string[] {
  return [
    asText(fields["Public Missing Submissions"], ""),
    asText(fields["Public Missing Homework"], ""),
    asText(fields["Public Missing Videos"], ""),
    asText(fields["Public Missing Zoom"], ""),
    asText(fields["Public Missing Streak"], ""),
  ].filter((item) => item && item !== "—");
}

function mapProgression(
  fields: PublicEnrollmentFields,
  nextLevelName: string | null,
): PublicProgression {
  const totalShots = asOptionalNumber(fields["Total Shots Counted"]) ?? 0;
  const target = asOptionalNumber(fields["Target Goal Shots"]);
  const goalMetText = asText(fields["Goal Met?"], "");
  const goalMet = Boolean(goalMetText && goalMetText !== "—");
  const goalProgressPercent =
    target != null && target > 0 ? Math.min(100, Math.round((totalShots / target) * 100)) : null;

  return {
    currentLevel: asText(fields["Current Level - Public Facing Display"], "") || null,
    nextLevel: nextLevelName,
    lifetimeXp: asOptionalNumber(fields["Lifetime XP Total"]) ?? 0,
    xpIntoLevel: asOptionalNumber(fields["XP Progress in Current Level"]),
    xpNeededForNextLevel: asOptionalNumber(fields["XP Needed for Next Level"]),
    currentLevelXpRequired: asOptionalNumber(fields["Current Level XP Required"]),
    nextLevelXpRequired: asOptionalNumber(fields["Next Level XP Required"]),
    targetShotGoal: target,
    goalMet,
    goalProgressPercent,
    progressionStatus: asText(fields["Public Progression Status"], "") || null,
    gateMissingReason: asText(fields["Public Gate Missing Reason"], "") || null,
    missingRequirements: collectMissing(fields),
  };
}

function achievementGroup(type: string | null, category: string | null): PublicAchievementGroup {
  const hay = `${type ?? ""} ${category ?? ""}`.toLowerCase();
  if (hay.includes("streak")) return "Streaks";
  if (hay.includes("milestone") || hay.includes("shot")) return "Shot Milestones";
  if (hay.includes("perfect")) return "Perfect Week";
  if (hay.includes("challenge") || hay.includes("level") || hay.includes("goal")) {
    return "Challenge Accomplishments";
  }
  return "Other";
}

export function mapPublicAchievements(
  unlocks: Array<{ fields: PublicUnlockFields }>,
  defsById: Map<string, { name: string; badgeIconName: string | null }>,
): PublicAchievement[] {
  const out: PublicAchievement[] = [];

  for (const unlock of unlocks) {
    const fields = unlock.fields;
    if (!asBoolean(fields["Active?"])) continue;
    if (!asBoolean(fields["Visible?"])) continue;

    const achievementIds = linkedRecordIds(fields.Achievement);
    const def = achievementIds[0] ? defsById.get(achievementIds[0]) : undefined;
    const name = def?.name?.trim();
    if (!name) continue;

    const type = asText(fields["Achievement Type"], "") || null;
    const category = asText(fields.Category, "") || null;
    const unlockedAt = asOptionalDateKey(fields["Date Unlocked"]);
    const keyBase = normalizeProfileSlug(`${name}-${unlockedAt ?? "earned"}-${out.length}`);

    out.push({
      key: keyBase || `achievement-${out.length}`,
      name,
      type,
      category,
      group: achievementGroup(type, category),
      unlockedAt,
      triggerValue: asOptionalNumber(fields["Trigger Value"]),
      xpAwarded: asOptionalNumber(fields["XP Awarded"]),
      rarity: asText(fields.Rarity, "") || null,
      badgeIconName: def?.badgeIconName ?? null,
    });
  }

  return out;
}

export function mapRecentSubmissions(
  records: Array<{ fields: PublicSubmissionFields }>,
): PublicActivityItem[] {
  return records.map((record, index) => {
    const fields = record.fields;
    const date = asOptionalDateKey(fields["Activity Date"]);
    const shots = asOptionalNumber(fields["Total Shots Counted"]);
    const makes = asOptionalNumber(fields["Total Makes Counted"]);
    const mode = asText(fields["Submission Stat Mode"], "");
    const hasDetailedStats = mode === "Detailed Shooting";
    const detailParts: string[] = [];
    if (shots != null) detailParts.push(`${shots} shots`);
    if (hasDetailedStats && makes != null) detailParts.push(`${makes} makes`);

    return {
      key: `sub-${date ?? "undated"}-${index}`,
      kind: "submission" as const,
      date,
      title: "Shooting session",
      detail: detailParts.length ? detailParts.join(" · ") : null,
      shots,
      makes: hasDetailedStats ? makes : null,
      xp: null,
      hasDetailedStats,
    };
  });
}

export function mapXpSummariesToPublicActivity(rows: XpEventSummary[]): PublicActivityItem[] {
  return rows.map((row, index) => {
    const reason = asText(row.reasonPublic, "");
    const source = asText(row.sourceLabel, "");
    const title =
      reason && reason !== "—"
        ? reason
        : source
          ? formatXpSourceLabel(source)
          : "XP earned";
    const xp = row.points;
    return {
      key: `xp-${row.activityDate ?? "undated"}-${source || "xp"}-${index}`,
      kind: "xp" as const,
      date: row.activityDate ?? null,
      title,
      detail: xp != null ? `+${xp} XP` : null,
      shots: null,
      makes: null,
      xp,
      hasDetailedStats: false,
    };
  });
}

export function mapRecentXpEvents(
  records: Array<{ fields: PublicXpEventFields }>,
): PublicActivityItem[] {
  return records
    .filter((record) => asBoolean(record.fields["Active?"]))
    .map((record, index) => {
      const fields = record.fields;
      const xp = asOptionalNumber(fields["Active XP Points"]);
      const reason = asText(fields["XP Reason Public"], "") || asText(fields["XP Source"], "XP");
      const date =
        asOptionalDateKey(fields["XP Activity Date"]) ?? asOptionalDateKey(fields.Created);
      return {
        key: `xp-${date ?? "undated"}-${index}`,
        kind: "xp" as const,
        date,
        title: reason === "—" ? "XP earned" : reason,
        detail: xp != null ? `+${xp} XP` : null,
        shots: null,
        makes: null,
        xp,
        hasDetailedStats: false,
      };
    });
}

export function mergeRecentActivity(
  submissions: PublicActivityItem[],
  xpEvents: PublicActivityItem[],
  limit = 12,
): PublicActivityItem[] {
  return [...submissions, ...xpEvents]
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    .slice(0, limit);
}

export type PublicWeekMeta = {
  name: string;
  startDate: string | null;
  endDate: string | null;
};

/** Challenge calendar day in America/Denver (matches XP / automation date keys). */
export function challengeTodayDateKey(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

export function buildPublicWeekMetaIndex(
  weekRecords: Array<{
    id: string;
    fields: { "Week Name"?: unknown; "Start Date"?: unknown; "End Date"?: unknown };
  }>,
): Map<string, PublicWeekMeta> {
  return new Map(
    weekRecords.map((record) => [
      record.id,
      {
        name: asText(record.fields["Week Name"], "Week"),
        startDate: asOptionalDateKey(record.fields["Start Date"]),
        endDate: asOptionalDateKey(record.fields["End Date"]),
      },
    ]),
  );
}

/** True when the week has started (Start Date on or before today). Missing dates stay visible. */
export function isWeekCurrentOrPast(
  weekMeta: PublicWeekMeta | undefined,
  todayKey: string,
): boolean {
  const startKey = weekMeta?.startDate ?? null;
  if (!startKey) return true;
  return startKey <= todayKey;
}

function mapSingleWeeklySummary(
  record: { fields: PublicWasFields },
  index: number,
  weekMetaById: Map<string, PublicWeekMeta>,
): { summary: PublicWeeklySummary; weekMeta: PublicWeekMeta | undefined } {
  const fields = record.fields;
  const weekIds = linkedRecordIds(fields.Week);
  const weekMeta = weekIds[0] ? weekMetaById.get(weekIds[0]) : undefined;
  const weekFromLink = weekMeta?.name;
  const weekLabel =
    asText(fields["Weekly Email Week Label"], "") ||
    weekFromLink ||
    `Week ${index + 1}`;

  const homeworkRaw = asOptionalNumber(fields["Homework Completed?"]);
  const homeworkCompleted =
    homeworkRaw == null ? null : homeworkRaw === 1 || homeworkRaw > 0;

  const perfectEligible = asOptionalNumber(fields["Perfect Week Eligible?"]) === 1;
  const perfectUnlock = linkedRecordIds(fields["Perfect Week Unlock"]).length > 0;

  return {
    weekMeta,
    summary: {
      key: normalizeProfileSlug(`${weekLabel}-${index}`) || `week-${index}`,
      weekLabel,
      totalShots: asOptionalNumber(fields["Total Shots This Week"]) ?? 0,
      daysLogged: asOptionalNumber(fields["Days Logged This Week"]),
      weeklyXp: asOptionalNumber(fields["XP Earned This Week"]),
      goalCompletionPercent: (() => {
        const ratio = asOptionalPercentRatio(fields["Goal Completion %"]);
        return ratio == null ? null : Math.round(ratio * 100);
      })(),
      momentumStatus: asText(fields["Momentum Status"], "") || null,
      homeworkCompleted,
      perfectWeek: perfectEligible || perfectUnlock,
    },
  };
}

function compareWeeklySummariesByRecency(
  a: { summary: PublicWeeklySummary; weekMeta: PublicWeekMeta | undefined },
  b: { summary: PublicWeeklySummary; weekMeta: PublicWeekMeta | undefined },
): number {
  const aStart = a.weekMeta?.startDate ? toAirtableDateKey(a.weekMeta.startDate) : null;
  const bStart = b.weekMeta?.startDate ? toAirtableDateKey(b.weekMeta.startDate) : null;
  if (aStart && bStart && aStart !== bStart) {
    return bStart.localeCompare(aStart);
  }
  if (aStart && !bStart) return -1;
  if (!aStart && bStart) return 1;

  const aNum = parseWeekNumber(a.summary.weekLabel);
  const bNum = parseWeekNumber(b.summary.weekLabel);
  if (aNum !== bNum) return bNum - aNum;

  return a.summary.weekLabel.localeCompare(b.summary.weekLabel, undefined, {
    sensitivity: "base",
  });
}

export function mapWeeklySummaries(
  records: Array<{ fields: PublicWasFields }>,
  weekMetaById: Map<string, PublicWeekMeta>,
  options: { todayKey?: string; limit?: number } = {},
): PublicWeeklySummary[] {
  const todayKey = options.todayKey ?? challengeTodayDateKey();
  const limit = options.limit ?? 8;

  return records
    .map((record, index) => mapSingleWeeklySummary(record, index, weekMetaById))
    .filter(({ weekMeta }) => isWeekCurrentOrPast(weekMeta, todayKey))
    .sort(compareWeeklySummariesByRecency)
    .slice(0, limit)
    .map(({ summary }) => summary);
}

export type BuildPublicProfileInput = {
  slug: string;
  fields: PublicEnrollmentFields;
  rank: number | null;
  nextLevelName: string | null;
  recentActivity: PublicActivityItem[];
  activityLedgerTotal?: number;
  activityLedgerNotice?: string | null;
  weekly: PublicWeeklySummary[];
  achievements: PublicAchievement[];
};

export function buildPublicAthleteProfile(input: BuildPublicProfileInput): PublicAthleteProfile {
  const { fields, slug } = input;
  const schoolYear = asText(fields["School Year"], "");
  const seasonLabel = schoolYear && schoolYear !== "—" ? `${schoolYear} Season` : "Current Season";
  const headshot = mapAttachments(fields["Athlete Headshot"])[0];
  const shooting = mapShooting(fields);
  const progression = mapProgression(fields, input.nextLevelName);
  const lastSubmissionDate =
    input.recentActivity.find(
      (item) =>
        item.kind === "submission" ||
        /shooting submission/i.test(item.title) ||
        item.title === "Shooting submission completed.",
    )?.date ?? input.recentActivity.find((item) => item.date)?.date ?? null;

  const currentStreak = asOptionalNumber(fields["Current Shooting Streak"]) ?? 0;
  const longestStreak = asOptionalNumber(fields["Longest Streak Days"]) ?? 0;

  return {
    identity: {
      slug,
      displayName: asText(fields["Full Athlete Name"], "Athlete"),
      school: asText(fields["School Name Lookup"], "") || null,
      grade: asText(fields.Grade, "") || null,
      seasonLabel,
      programLabel: asText(fields["Program Instance Name Only"], "") || null,
      level: asText(fields["Current Level - Public Facing Display"], "") || null,
      rank: input.rank,
      headshotUrl: headshot?.url ?? null,
      progressionStatus: asText(fields["Public Progression Status"], "") || null,
    },
    performance: {
      totalShots: asOptionalNumber(fields["Total Shots Counted"]) ?? 0,
      lifetimeXp: asOptionalNumber(fields["Lifetime XP Total"]) ?? 0,
      currentLevel: asText(fields["Current Level - Public Facing Display"], "") || null,
      xpNeededForNextLevel: asOptionalNumber(fields["XP Needed for Next Level"]),
      currentStreak,
      longestStreak,
      totalSubmissions: asOptionalNumber(fields["Total Submissions"]) ?? 0,
      lastSubmissionDate,
    },
    shooting,
    progression,
    streaks: {
      current: currentStreak,
      longest: longestStreak,
      status: asText(fields["Current Shooting Streak Status"], "") || null,
      asOfDate: asOptionalDateKey(fields["Current Shooting Streak As Of"]),
    },
    recentActivity: input.recentActivity,
    activityLedgerTotal: input.activityLedgerTotal ?? input.recentActivity.length,
    activityLedgerNotice: input.activityLedgerNotice ?? null,
    weekly: input.weekly,
    achievements: input.achievements,
    fetchedAt: new Date().toISOString(),
    mayBeStale: true,
  };
}

/** Escape a string for Airtable formula double-quoted literals. */
export function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
