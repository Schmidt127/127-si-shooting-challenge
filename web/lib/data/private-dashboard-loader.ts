/**
 * Authenticated athlete dashboard — server-only Airtable loader.
 */

import { listAirtableRecords } from "@/lib/airtable/client";
import { listCurrentPhaRecords } from "@/lib/airtable/homework-queries";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import { PUBLIC_PROFILE_ENROLLMENT_FIELDS } from "@/lib/airtable/queries";
import type { AuthorizedEnrollment } from "@/lib/auth/enrollment-access";
import {
  asBoolean,
  asNumber,
  asOptionalDateKey,
  asOptionalNumber,
  asText,
  linkedRecordIds,
  lookupItems,
  selectName,
} from "@/lib/data/airtable-values";
import { mapAttachments, parseWeekNumber } from "@/lib/data/homework";
import { opaqueDashboardKey } from "@/lib/data/opaque-dashboard-key";
import {
  completionStatusLabel,
  mapCompletionStatus,
  resolveAssignmentDueDateKey,
  resolveAssignmentDisplayName,
  resolveAssignmentDescription,
  resolveViewSubmittedHomeworkHref,
  type PublicHomeworkCompletionFields,
  type PublicHomeworkLibraryFields,
  type PublicHomeworkWeekFields,
  type PublicPhaFields,
} from "@/lib/data/public-athlete-homework";
import {
  buildPublicWeekMetaIndex,
  escapeAirtableString,
  mapPublicAchievements,
  mapWeeklySummaries,
  type PublicAchievementDefFields,
  type PublicEnrollmentFields,
  type PublicUnlockFields,
  type PublicWasFields,
} from "@/lib/data/public-athlete-profile";
import { resolveSecureReviewerUrl } from "@/lib/data/secure-reviewer-url";
import { loadXpActivityForEnrollment } from "@/lib/data/xp-activity-loader";
import type {
  DashboardAwardItem,
  DashboardEnrollmentDetails,
  DashboardHomeworkItem,
  DashboardVideoFeedbackItem,
  PrivateAthleteDashboardPayload,
} from "@/types/private-athlete-dashboard";
import type { PublicWeeklySummary } from "@/types/public-athlete-profile";

const REVALIDATE_SECONDS = 60;

export const PRIVATE_DASHBOARD_ENROLLMENT_FIELDS = [
  ...PUBLIC_PROFILE_ENROLLMENT_FIELDS,
  "Registration Source",
  "Grade Band Label",
  "Athlete Match Status",
  "Grade Band Status",
  "Level Status",
  "Video Feedback",
  "Award Recipients",
] as const;

const PRIVATE_WAS_FIELDS = [
  "Weekly Email Week Label",
  "Total Shots This Week",
  "Days Logged This Week",
  "XP Earned This Week",
  "Goal Completion %",
  "Momentum Status",
  "Homework Completed?",
  "Perfect Week Eligible?",
  "Perfect Week Unlock",
  "Perfect Week Video Count",
  "Perfect Week Homework Requirement Status",
  "Perfect Week Zoom Requirement Status",
  "Week",
] as const;

const PRIVATE_UNLOCK_FIELDS = [
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

const PRIVATE_HC_FIELDS = [
  "Program Homework Assignment",
  "Completion Status",
  "Satisfactory?",
  "Base XP Awarded",
  "Extra Credit XP Awarded",
  "Coach Feedback",
  "Submission Date",
  "Submission Asset: Reviewer File URL (lookup)",
  "Parent Feedback Ready?",
  "Parent Feedback Sent?",
  "Review Complete",
] as const;

const PRIVATE_VF_FIELDS = [
  "Coach Feedback",
  "Feedback Posted?",
  "Award Status",
  "Reviewed At",
  "Activity Date - Lkp",
  "Video Asset File Name",
  "Custom Video File Name",
  "Video File - AWS",
  "Video Feedback Workflow Status",
  "Parent Feedback Ready?",
  "Parent Feedback Sent?",
  "Total Video XP Awarded",
  "Week",
] as const;

const PRIVATE_AR_FIELDS = [
  "Award - Display",
  "Award Description - Display",
  "Date Awarded",
  "Award Amount",
  "Award Status",
  "Delivery Method",
  "Tremendous Delivery Status",
  "Award Scope",
  "Coach Feedback - Awards",
  "Week",
  "Tremendous Test Record?",
  "Public On Web",
] as const;

const ACHIEVEMENT_DEF_FIELDS = ["Achievement Name", "Badge Icon Name"] as const;

function recordIdFormula(ids: string[]): string {
  const clauses = [...new Set(ids.filter(Boolean))].map(
    (id) => `RECORD_ID()='${escapeAirtableString(id)}'`,
  );
  if (clauses.length === 0) return "FALSE()";
  if (clauses.length === 1) return clauses[0];
  return `OR(${clauses.join(",")})`;
}

async function fetchEnrollmentFields(
  enrollmentId: string,
): Promise<PublicEnrollmentFields | null> {
  const response = await listAirtableRecords<PublicEnrollmentFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.enrollments.name,
    maxRecords: 1,
    fields: [...PRIVATE_DASHBOARD_ENROLLMENT_FIELDS],
    filterByFormula: `RECORD_ID()='${escapeAirtableString(enrollmentId)}'`,
    revalidateSeconds: REVALIDATE_SECONDS,
  });
  return response.records[0]?.fields ?? null;
}

type VideoFeedbackFields = {
  "Coach Feedback"?: unknown;
  "Feedback Posted?"?: unknown;
  "Award Status"?: unknown;
  "Reviewed At"?: unknown;
  "Activity Date - Lkp"?: unknown;
  "Video Asset File Name"?: unknown;
  "Custom Video File Name"?: unknown;
  "Video File - AWS"?: unknown;
  "Video Feedback Workflow Status"?: unknown;
  "Parent Feedback Ready?"?: unknown;
  "Parent Feedback Sent?"?: unknown;
  "Total Video XP Awarded"?: unknown;
  Week?: unknown;
};

type AwardRecipientFields = {
  "Award - Display"?: unknown;
  "Award Description - Display"?: unknown;
  "Date Awarded"?: unknown;
  "Award Amount"?: unknown;
  "Award Status"?: unknown;
  "Delivery Method"?: unknown;
  "Tremendous Delivery Status"?: unknown;
  "Award Scope"?: unknown;
  "Coach Feedback - Awards"?: unknown;
  Week?: unknown;
  "Tremendous Test Record?"?: unknown;
  "Public On Web"?: unknown;
};

function mapVideoFeedbackStatus(fields: VideoFeedbackFields): DashboardVideoFeedbackItem["status"] {
  const workflow = selectName(fields["Video Feedback Workflow Status"], "");
  const award = selectName(fields["Award Status"], "");
  const feedbackPosted = asBoolean(fields["Feedback Posted?"]);

  if (feedbackPosted || workflow === "Completed" || workflow === "Feedback Given") {
    return "feedback_available";
  }
  if (award === "Awarded" || workflow === "Ready for XP") return "reviewed";
  if (workflow === "Needs Review") return "submitted";
  return "pending";
}

function mapVideoFeedbackRecords(
  records: Array<{ id: string; fields: VideoFeedbackFields }>,
  weekMetaById: Map<string, { name: string }>,
): DashboardVideoFeedbackItem[] {
  return records
    .map((record) => {
      const fields = record.fields;
      const weekIds = linkedRecordIds(fields.Week);
      const weekLabel = weekIds[0] ? (weekMetaById.get(weekIds[0])?.name ?? "Week") : "Week";
      const activityDate =
        lookupItems(fields["Activity Date - Lkp"])
          .map((item) => asOptionalDateKey(item))
          .find(Boolean) ?? null;
      const title =
        asText(fields["Custom Video File Name"], "").trim() ||
        asText(fields["Video Asset File Name"], "").trim() ||
        "Video submission";

      return {
        key: opaqueDashboardKey("vf", record.id),
        activityDate,
        weekLabel,
        title,
        status: mapVideoFeedbackStatus(fields),
        coachFeedback: asText(fields["Coach Feedback"], "") || null,
        feedbackDate: asOptionalDateKey(fields["Reviewed At"]),
        xpAwarded: asOptionalNumber(fields["Total Video XP Awarded"]),
        secureVideoUrl: resolveSecureReviewerUrl(fields["Video File - AWS"]),
        parentFeedbackReady: asBoolean(fields["Parent Feedback Ready?"]) || null,
        parentFeedbackSent: asBoolean(fields["Parent Feedback Sent?"]) || null,
      };
    })
    .sort((a, b) => String(b.activityDate ?? "").localeCompare(String(a.activityDate ?? "")));
}

function mapAwardRecords(
  records: Array<{ id: string; fields: AwardRecipientFields }>,
  weekMetaById: Map<string, { name: string }>,
): DashboardAwardItem[] {
  return records
    .filter((record) => !asBoolean(record.fields["Tremendous Test Record?"]))
    .map((record) => {
      const fields = record.fields;
      const status = selectName(fields["Award Status"], "Pending");
      const weekIds = linkedRecordIds(fields.Week);
      const weekLabel = weekIds[0] ? (weekMetaById.get(weekIds[0])?.name ?? null) : null;
      const amount = asOptionalNumber(lookupItems(fields["Award Amount"])[0]);

      return {
        key: opaqueDashboardKey("award", record.id),
        awardName: asText(fields["Award - Display"], "") || "Season award",
        awardDate: asOptionalDateKey(fields["Date Awarded"]),
        amount: amount != null && amount > 0 ? amount : null,
        reason:
          asText(fields["Coach Feedback - Awards"], "") ||
          asText(fields["Award Description - Display"], "") ||
          null,
        recipientStatus: status,
        deliveryStatus:
          selectName(fields["Tremendous Delivery Status"], "") ||
          selectName(fields["Delivery Method"], "") ||
          null,
        scope: selectName(fields["Award Scope"], "") || null,
        weekLabel,
        // Public badge uses Public On Web only — never Award Status.
        publiclyVisible: asBoolean(fields["Public On Web"]) === true,
      };
    })
    .sort((a, b) => String(b.awardDate ?? "").localeCompare(String(a.awardDate ?? "")));
}

function mapEnrollmentDetails(
  fields: PublicEnrollmentFields,
  enrollment: AuthorizedEnrollment,
): DashboardEnrollmentDetails {
  return {
    displayName: enrollment.displayName,
    school: enrollment.school,
    grade: enrollment.grade,
    gradeBand: asText(fields["Grade Band Label"], "") || null,
    seasonLabel: asText(fields["School Year"], "") || "Current season",
    programLabel: asText(fields["Program Instance Name Only"], "") || "Shooting Challenge",
    registrationSource: selectName(fields["Registration Source"], "") || null,
    enrollmentStatus: asBoolean(fields["Active?"]) ? "Active" : "Inactive",
    athleteMatchStatus: selectName(fields["Athlete Match Status"], "") || null,
    gradeBandStatus: selectName(fields["Grade Band Status"], "") || null,
    levelStatus: selectName(fields["Level Status"], "") || null,
    progressionStatus: asText(fields["Public Progression Status"], "") || null,
  };
}

function homeworkBadgeStatus(
  status: ReturnType<typeof mapCompletionStatus>,
  satisfactory: boolean,
  xpAwarded: number | null,
): DashboardHomeworkItem["badgeStatus"] {
  if (satisfactory || (xpAwarded != null && xpAwarded > 0)) return "awarded";
  if (status === "approved") return "complete";
  if (status === "needs_revision") return "needs_revision";
  if (status === "submitted" || status === "under_review") return "submitted";
  return "pending";
}

async function buildPrivateHomeworkItems(input: {
  enrollmentGradeBandId: string | null;
  phaRecords: Array<{ id: string; fields: PublicPhaFields }>;
  libraryById: Map<string, PublicHomeworkLibraryFields>;
  weekById: Map<string, PublicHomeworkWeekFields>;
  completionRecords: Array<{ id: string; fields: PublicHomeworkCompletionFields & Record<string, unknown> }>;
}): Promise<DashboardHomeworkItem[]> {
  const completionsByPhaId = new Map<string, (typeof input.completionRecords)[0]["fields"]>();
  for (const record of input.completionRecords) {
    const phaId = linkedRecordIds(record.fields["Program Homework Assignment"])[0];
    if (phaId) completionsByPhaId.set(phaId, record.fields);
  }

  const items: DashboardHomeworkItem[] = [];

  for (const pha of input.phaRecords) {
    if (pha.fields["Active?"] !== true) continue;
    const gradeBandIds = linkedRecordIds(pha.fields["Grade Band"]);
    if (
      input.enrollmentGradeBandId &&
      gradeBandIds.length > 0 &&
      !gradeBandIds.includes(input.enrollmentGradeBandId)
    ) {
      continue;
    }

    const homeworkId = linkedRecordIds(pha.fields["Homework Assignment"])[0];
    const weekId = linkedRecordIds(pha.fields.Week)[0];
    if (!homeworkId || !weekId) continue;

    const library = input.libraryById.get(homeworkId) ?? {};
    const weekFields = input.weekById.get(weekId);
    const weekMeta = weekFields
      ? {
          name: asText(weekFields["Week Name"], "Week"),
          startDate: asOptionalDateKey(weekFields["Start Date"]),
          endDate: asOptionalDateKey(weekFields["End Date"]),
          weekNumber: parseWeekNumber(asText(weekFields["Week Name"], "")),
        }
      : undefined;
    const completion = completionsByPhaId.get(pha.id);
    const completionStatus = mapCompletionStatus(completion?.["Completion Status"]);
    const satisfactory = completion?.["Satisfactory?"] === true;
    const baseXp = asNumber(completion?.["Base XP Awarded"]);
    const extraXp = asNumber(completion?.["Extra Credit XP Awarded"]);
    const xpAwarded =
      completion == null
        ? null
        : Math.max(0, (Number.isFinite(baseXp) ? baseXp : 0) + (Number.isFinite(extraXp) ? extraXp : 0));

    const dueDate = resolveAssignmentDueDateKey(pha.fields, weekMeta);
    const submissionDate = asOptionalDateKey(completion?.["Submission Date"]);
    const lateSubmission = Boolean(dueDate && submissionDate && submissionDate > dueDate);

    items.push({
      key: opaqueDashboardKey("hw", pha.id),
      assignmentName: resolveAssignmentDisplayName(library),
      description: resolveAssignmentDescription(library),
      weekLabel: weekMeta?.name ?? "Week",
      homeworkSlot: selectName(pha.fields["Homework Slot"], "") || null,
      assignedDate: weekMeta?.startDate ?? null,
      dueDate,
      submissionDate,
      lateSubmission,
      completionStatus,
      completionStatusLabel: completionStatusLabel(completionStatus),
      satisfactory: completion ? satisfactory : null,
      badgeStatus: homeworkBadgeStatus(completionStatus, satisfactory, xpAwarded),
      xpAwarded,
      coachFeedback: asText(completion?.["Coach Feedback"], "") || null,
      parentFeedbackReady: completion ? asBoolean(completion["Parent Feedback Ready?"]) : null,
      parentFeedbackSent: completion ? asBoolean(completion["Parent Feedback Sent?"]) : null,
      homeworkDetailHref: homeworkId ? `/homework/${homeworkId}` : null,
      viewSubmittedHomeworkHref: resolveViewSubmittedHomeworkHref(
        completion?.["Submission Asset: Reviewer File URL (lookup)"],
      ),
    });
  }

  return items.sort((a, b) => {
    const weekCmp = String(a.assignedDate ?? "").localeCompare(String(b.assignedDate ?? ""));
    if (weekCmp !== 0) return weekCmp;
    return (a.homeworkSlot ?? "").localeCompare(b.homeworkSlot ?? "");
  });
}

function pickCurrentWeekSummary(weekly: PublicWeeklySummary[]): PublicWeeklySummary | null {
  return weekly[0] ?? null;
}

function buildRecentActivitySummary(weekly: PublicWeeklySummary[]): string | null {
  const current = pickCurrentWeekSummary(weekly);
  if (!current) return null;
  const parts: string[] = [];
  if (current.totalShots > 0) parts.push(`${current.totalShots} shots logged`);
  if (current.weeklyXp != null && current.weeklyXp > 0) parts.push(`${current.weeklyXp} XP earned`);
  if (current.perfectWeek) parts.push("Perfect Week earned");
  else if (current.perfectWeekStatusLabel === "In Progress") parts.push("Perfect Week in progress");
  return parts.length > 0 ? parts.join(" · ") : null;
}

function deriveNextAction(homework: DashboardHomeworkItem[]): PrivateAthleteDashboardPayload["nextAction"] {
  const pending = homework.find(
    (item) => item.badgeStatus === "pending" || item.badgeStatus === "needs_revision",
  );
  if (pending?.homeworkDetailHref) {
    return {
      label:
        pending.badgeStatus === "needs_revision" ? "Revise homework" : "Open this week's homework",
      description:
        pending.badgeStatus === "needs_revision"
          ? `${pending.assignmentName} needs another look — review coach feedback and resubmit.`
          : `${pending.assignmentName} is ready when you are. Daily shot logging uses the external submission form.`,
      href: pending.homeworkDetailHref,
    };
  }
  return {
    label: "Browse homework assignments",
    description:
      "Daily shot logging uses the external submission form. Review curriculum and assignment details on the homework page.",
    href: "/homework",
  };
}

export async function loadPrivateAthleteDashboardPayload(
  enrollment: AuthorizedEnrollment,
): Promise<PrivateAthleteDashboardPayload> {
  const enrollmentFields = await fetchEnrollmentFields(enrollment.enrollmentId);
  if (!enrollmentFields) {
    throw new Error("Enrollment record unavailable for dashboard.");
  }

  const wasIds = linkedRecordIds(enrollmentFields["Weekly Athlete Summary"]).slice(0, 24);
  const unlockIds = linkedRecordIds(enrollmentFields["Athlete Achievement Unlocks"]).slice(0, 50);
  const homeworkCompletionIds = linkedRecordIds(enrollmentFields["Homework Completions"]);
  const videoFeedbackIds = linkedRecordIds(enrollmentFields["Video Feedback"]).slice(0, 50);
  const awardRecipientIds = linkedRecordIds(enrollmentFields["Award Recipients"]).slice(0, 30);
  const enrollmentGradeBandId = linkedRecordIds(enrollmentFields["Grade Band"])[0] ?? null;
  const headshot = mapAttachments(enrollmentFields["Athlete Headshot"])[0]?.url;

  const [wasResponse, unlockResponse, vfResponse, arResponse, xpResult, phaRecords] =
    await Promise.all([
      wasIds.length
        ? listAirtableRecords<PublicWasFields>({
            tableName: PUBLIC_AIRTABLE_TABLES.weeklySummary.name,
            maxRecords: wasIds.length,
            fields: [...PRIVATE_WAS_FIELDS],
            filterByFormula: recordIdFormula(wasIds),
            revalidateSeconds: REVALIDATE_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicWasFields }> }),
      unlockIds.length
        ? listAirtableRecords<PublicUnlockFields>({
            tableName: PUBLIC_AIRTABLE_TABLES.achievementUnlocks.name,
            maxRecords: unlockIds.length,
            fields: [...PRIVATE_UNLOCK_FIELDS],
            filterByFormula: recordIdFormula(unlockIds),
            sort: [{ field: "Date Unlocked", direction: "desc" }],
            revalidateSeconds: REVALIDATE_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicUnlockFields }> }),
      videoFeedbackIds.length
        ? listAirtableRecords<VideoFeedbackFields>({
            tableName: PUBLIC_AIRTABLE_TABLES.videoFeedback.name,
            maxRecords: videoFeedbackIds.length,
            fields: [...PRIVATE_VF_FIELDS],
            filterByFormula: recordIdFormula(videoFeedbackIds),
            revalidateSeconds: REVALIDATE_SECONDS,
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: VideoFeedbackFields }> }),
      awardRecipientIds.length
        ? listAirtableRecords<AwardRecipientFields>({
            tableName: PUBLIC_AIRTABLE_TABLES.awardRecipients.name,
            maxRecords: awardRecipientIds.length,
            fields: [...PRIVATE_AR_FIELDS],
            filterByFormula: recordIdFormula(awardRecipientIds),
            sort: [{ field: "Date Awarded", direction: "desc" }],
            revalidateSeconds: REVALIDATE_SECONDS,
          }).catch(async () => {
            // Public On Web may not exist under that exact casing yet — load private details without it.
            const fieldsWithoutPublication = PRIVATE_AR_FIELDS.filter(
              (name) => name !== "Public On Web",
            );
            return listAirtableRecords<AwardRecipientFields>({
              tableName: PUBLIC_AIRTABLE_TABLES.awardRecipients.name,
              maxRecords: awardRecipientIds.length,
              fields: [...fieldsWithoutPublication],
              filterByFormula: recordIdFormula(awardRecipientIds),
              sort: [{ field: "Date Awarded", direction: "desc" }],
              revalidateSeconds: REVALIDATE_SECONDS,
            });
          })
        : Promise.resolve({ records: [] as Array<{ id: string; fields: AwardRecipientFields }> }),
      loadXpActivityForEnrollment(enrollment.enrollmentId, { maxRows: 100 }),
      listCurrentPhaRecords(),
    ]);

  const weekIds = [
    ...new Set([
      ...wasResponse.records.flatMap((r) => linkedRecordIds(r.fields.Week)),
      ...vfResponse.records.flatMap((r) => linkedRecordIds(r.fields.Week)),
      ...arResponse.records.flatMap((r) => linkedRecordIds(r.fields.Week)),
    ]),
  ];

  const weekRecords = weekIds.length
    ? (
        await listAirtableRecords<PublicHomeworkWeekFields>({
          tableName: PUBLIC_AIRTABLE_TABLES.weeks.name,
          maxRecords: weekIds.length,
          fields: ["Week Name", "Start Date", "End Date"],
          filterByFormula: recordIdFormula(weekIds),
          revalidateSeconds: REVALIDATE_SECONDS,
        })
      ).records
    : [];

  const weekMetaById = buildPublicWeekMetaIndex(weekRecords);
  const weekMetaSimple = new Map(
    [...weekMetaById.entries()].map(([id, meta]) => [id, { name: meta.name }]),
  );

  const weeklySummaries = mapWeeklySummaries(wasResponse.records, weekMetaById).sort((a, b) =>
    String(b.weekLabel).localeCompare(String(a.weekLabel)),
  );

  const achievementIds = [
    ...new Set(
      unlockResponse.records.flatMap((r) => linkedRecordIds(r.fields.Achievement)).filter(Boolean),
    ),
  ];
  const achievementDefs = achievementIds.length
    ? (
        await listAirtableRecords<PublicAchievementDefFields>({
          tableName: PUBLIC_AIRTABLE_TABLES.achievements.name,
          maxRecords: achievementIds.length,
          fields: [...ACHIEVEMENT_DEF_FIELDS],
          filterByFormula: recordIdFormula(achievementIds),
          revalidateSeconds: REVALIDATE_SECONDS,
        })
      ).records
    : [];

  const defsById = new Map(
    achievementDefs.map((record) => [
      record.id,
      {
        name: asText(record.fields["Achievement Name"], ""),
        badgeIconName: asText(record.fields["Badge Icon Name"], "") || null,
      },
    ]),
  );

  const homeworkLibraryIds = [
    ...new Set(
      phaRecords.map((pha) => linkedRecordIds(pha.fields["Homework Assignment"])[0]).filter(Boolean),
    ),
  ];
  const phaWeekIds = [
    ...new Set(phaRecords.map((pha) => linkedRecordIds(pha.fields.Week)[0]).filter(Boolean)),
  ];

  const [libraryRecords, phaWeekRecords, hcRecords] = await Promise.all([
    homeworkLibraryIds.length
      ? listAirtableRecords<PublicHomeworkLibraryFields>({
          tableName: PUBLIC_AIRTABLE_TABLES.homeworkLibrary.name,
          maxRecords: homeworkLibraryIds.length,
          fields: [
            "Assignment Full Name",
            "Assignment Full Name - Display",
            "Assignment Title",
            "Brief Description - Display",
            "Homework Number",
            "Assignment Number",
            "Order",
          ],
          filterByFormula: recordIdFormula(homeworkLibraryIds),
          revalidateSeconds: REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicHomeworkLibraryFields }> }),
    phaWeekIds.length
      ? listAirtableRecords<PublicHomeworkWeekFields>({
          tableName: PUBLIC_AIRTABLE_TABLES.weeks.name,
          maxRecords: phaWeekIds.length,
          fields: ["Week Name", "Start Date", "End Date"],
          filterByFormula: recordIdFormula(phaWeekIds),
          revalidateSeconds: REVALIDATE_SECONDS,
        })
      : Promise.resolve({ records: [] as Array<{ id: string; fields: PublicHomeworkWeekFields }> }),
    homeworkCompletionIds.length
      ? listAirtableRecords<PublicHomeworkCompletionFields & Record<string, unknown>>({
          tableName: PUBLIC_AIRTABLE_TABLES.homeworkCompletions.name,
          maxRecords: homeworkCompletionIds.length,
          fields: [...PRIVATE_HC_FIELDS],
          filterByFormula: recordIdFormula(homeworkCompletionIds),
          revalidateSeconds: REVALIDATE_SECONDS,
        })
      : Promise.resolve({
          records: [] as Array<{ id: string; fields: PublicHomeworkCompletionFields & Record<string, unknown> }>,
        }),
  ]);

  const homework = await buildPrivateHomeworkItems({
    enrollmentGradeBandId,
    phaRecords,
    libraryById: new Map(libraryRecords.records.map((r) => [r.id, r.fields])),
    weekById: new Map(phaWeekRecords.records.map((r) => [r.id, r.fields])),
    completionRecords: hcRecords.records,
  });

  const totalShots = asOptionalNumber(enrollmentFields["Total Shots Counted"]) ?? 0;
  const targetGoal = asOptionalNumber(enrollmentFields["Target Goal Shots"]);
  const goalMetText = asText(enrollmentFields["Goal Met?"], "");
  const goalMet = Boolean(goalMetText && goalMetText !== "—");
  const goalProgressPercent =
    targetGoal != null && targetGoal > 0
      ? Math.min(100, Math.round((totalShots / targetGoal) * 100))
      : null;

  const currentWeek = pickCurrentWeekSummary(weeklySummaries);
  const warningParts: string[] = [];
  if (xpResult.warning) warningParts.push(xpResult.warning);
  if (xpResult.missingXpSubmissionIds.length > 0) {
    warningParts.push(
      `${xpResult.missingXpSubmissionIds.length} counted submission(s) have no XP Event.`,
    );
  }

  return {
    seasonLabel: asText(enrollmentFields["School Year"], "") || "Current season",
    programLabel: asText(enrollmentFields["Program Instance Name Only"], "") || "Shooting Challenge",
    athlete: {
      id: enrollment.slug || opaqueDashboardKey("athlete", enrollment.enrollmentId),
      slug: enrollment.slug || "athlete",
      displayName: enrollment.displayName,
      school: enrollment.school,
      grade: enrollment.grade,
      level: enrollment.level,
      avatarUrl: headshot,
    },
    xp: {
      total: enrollment.xpTotal,
      xpIntoLevel: enrollment.xpIntoLevel,
      xpForNextLevel: enrollment.xpForNextLevel,
      nextLevelLabel: enrollment.nextLevelLabel,
    },
    seasonOverview: {
      totalShots,
      totalXp: enrollment.xpTotal,
      currentLevel: enrollment.level,
      currentStreak: asOptionalNumber(enrollmentFields["Current Shooting Streak"]) ?? 0,
      longestStreak: asOptionalNumber(enrollmentFields["Longest Streak Days"]) ?? 0,
      goalProgressPercent,
      goalTargetShots: targetGoal,
      goalMet,
      recentActivitySummary: buildRecentActivitySummary(weeklySummaries),
    },
    weekly: {
      shots: currentWeek?.totalShots ?? 0,
      goal: 400,
      weekLabel: currentWeek?.weekLabel ?? "This week",
      daysLogged: currentWeek?.daysLogged ?? null,
      goalCompletionPercent: currentWeek?.goalCompletionPercent ?? null,
    },
    perfectWeek: {
      earnedThisWeek: currentWeek?.perfectWeek ?? false,
      seasonCount: weeklySummaries.filter((w) => w.perfectWeek).length,
    },
    seasonShots: totalShots,
    enrollment: mapEnrollmentDetails(enrollmentFields, enrollment),
    homework,
    videoFeedback: mapVideoFeedbackRecords(vfResponse.records, weekMetaSimple),
    weeklyProgress: weeklySummaries,
    awards: mapAwardRecords(arResponse.records, weekMetaSimple),
    achievements: mapPublicAchievements(unlockResponse.records, defsById).map((a) => ({
      id: a.key,
      name: a.name,
      unlocked: true,
    })),
    recentXp: xpResult.rows,
    recentXpTotal: xpResult.totalAvailableRows,
    xpWarning: warningParts.length > 0 ? warningParts.join(" ") : undefined,
    nextAction: deriveNextAction(homework),
  };
}
