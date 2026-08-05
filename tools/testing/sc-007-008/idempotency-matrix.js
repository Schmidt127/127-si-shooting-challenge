/**
 * SC-007 canonical idempotency matrix — Source Keys, writers, rerun expectations.
 * Pure data + helpers. Consumed by idempotency-proof-pack.test.js and PROD evidence.
 */
"use strict";

const {
  buildSubmissionXpSourceKey,
  buildHomeworkXpSourceKey,
  buildVideoXpSourceKey,
  buildStreakXpSourceKey,
  buildShotMilestoneSourceKey,
  buildPerfectWeekSourceKey,
  buildWeeklyThresholdSourceKey,
  buildZoomAttendBaseSourceKey,
  buildWeeklyEmailEventId,
  decideXpEventAction,
  decideHomeworkCompletionAction,
  planHomeworkMultiAssetCompletion,
} = require("../../../airtable/automations/shooting-challenge/lib/v2-engine-contracts");

const {
  buildZoomCreditSourceKey,
} = require("../../../airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance");

/** Stable synthetic RIDs for offline proofs (not live Airtable IDs). */
const FIX = {
  enrollment: "recEnrollment0001",
  submission: "recSubmission00001",
  homeworkCompletion: "recHomeworkComp001",
  homeworkAssignment: "recHomeworkAssign01",
  videoFeedback: "recVideoFeedback01",
  asset: "recSubmissionAsset01",
  achievement: "recAchievement0001",
  shotMilestone: "recShotMilestone01",
  week: "recWeek0000000001",
  zoomMeeting: "recZoomMeeting0001",
  streakEndDate: "2026-08-01",
};

/**
 * @typedef {object} IdempotencyPath
 * @property {string} id
 * @property {string} label
 * @property {string} domain
 * @property {string} canonicalDedupeKey
 * @property {string} expectedWriter
 * @property {string} firstRun
 * @property {string} secondRun
 * @property {string} retryAfterPartialFailure
 * @property {string[]} evidenceFields
 * @property {string} notes
 */

/** @type {IdempotencyPath[]} */
const IDEMPOTENCY_PATHS = [
  {
    id: "daily-submission-xp",
    label: "Daily submission XP",
    domain: "xp",
    canonicalDedupeKey: buildSubmissionXpSourceKey(FIX.submission),
    expectedWriter: "010-submission-intake-create-xp-event.js",
    firstRun: "create XP Event when Source Key absent",
    secondRun: "skip_existing — no second XP Event",
    retryAfterPartialFailure:
      "recheck Source Key before create; repair_link if linked XP missing key but same source",
    evidenceFields: ["Source Key", "XP Points", "Submission", "Enrollment"],
    notes: "Pattern SUBMISSION_XP|{submissionId}",
  },
  {
    id: "homework-completion",
    label: "Homework completion identity",
    domain: "homework",
    canonicalDedupeKey: `${FIX.enrollment}|${FIX.week}|${FIX.homeworkAssignment}`,
    expectedWriter:
      "020-homework-link-or-create-homework-completion.js / 067-homework-link-or-create-completion-from-reflection-quiz.js",
    firstRun: "create one Homework Completion when none exists",
    secondRun: "link_existing / reuse same HC — never a second HC for same identity",
    retryAfterPartialFailure:
      "planHomeworkMultiAssetCompletion reuses existing HC; ambiguous duplicates → error",
    evidenceFields: ["Enrollment", "Week", "Homework", "Homework Completions count"],
    notes:
      "020 uses Submission+Homework+slot; 067 quiz uses Enrollment|Week|Homework. Do not invent a third identity.",
  },
  {
    id: "homework-xp",
    label: "Homework XP",
    domain: "xp",
    canonicalDedupeKey: buildHomeworkXpSourceKey(FIX.homeworkCompletion),
    expectedWriter: "065-homework-review-and-xp-create-homework-xp-event.js",
    firstRun: "create HOMEWORK_XP|{hcId} after satisfactory review",
    secondRun: "skip_existing — one XP Event per HC",
    retryAfterPartialFailure: "recheck Source Key before create; refuse steal",
    evidenceFields: ["Source Key", "Homework Completion", "XP Points"],
    notes: "Legacy HOMEWORK_COMPLETION| keys are not the live writer pattern",
  },
  {
    id: "video-upload-writeback",
    label: "Video / asset upload writeback",
    domain: "upload",
    canonicalDedupeKey: `asset:${FIX.asset}|status:Uploaded|storageKey`,
    expectedWriter: "Lambda 127si-upload-asset (+ 070a/070b handoff, 070c clear)",
    firstRun: "claim → S3 put → Airtable Uploaded writeback + reviewer token",
    secondRun: "skipped_already_uploaded — no second object; preserve token",
    retryAfterPartialFailure:
      "retry from Pending Link / Error with claim lease; do not flip Uploaded→Processing after success",
    evidenceFields: [
      "Upload Status",
      "Send to Make Trigger",
      "Upload Error",
      "Canonical File URL",
      "Storage Key",
      "Uploaded At",
      "Reviewer Access Token",
      "Reviewer File URL",
    ],
    notes: "SC-150 owns reviewer fields; SC-007/008 prove idempotent retry only",
  },
  {
    id: "video-xp",
    label: "Video Feedback XP",
    domain: "xp",
    canonicalDedupeKey: buildVideoXpSourceKey(FIX.videoFeedback),
    expectedWriter: "114-video-review-and-xp-create-or-update-video-xp-event.js",
    firstRun: "create VIDEO_SUBMISSION|{vfId}",
    secondRun: "skip_existing",
    retryAfterPartialFailure: "steal-guard if linked XP belongs to another VF",
    evidenceFields: ["Source Key", "Video Feedback", "XP Points"],
    notes: "",
  },
  {
    id: "zoom-credit",
    label: "Zoom recording credit XP",
    domain: "xp",
    canonicalDedupeKey: buildZoomCreditSourceKey(FIX.enrollment, FIX.zoomMeeting),
    expectedWriter:
      "117-zoom-recording-credit-orchestrator.js OR 117c (design-alts only; not deployed under PROD 117 — PROD 117 is email-to-Make)",
    firstRun: "create ZOOM_CREDIT|{enrollmentId}|{meetingId}",
    secondRun: "skip_existing",
    retryAfterPartialFailure: "soft-void + recheck Source Key; never write Attendees",
    evidenceFields: ["Source Key", "Enrollment", "XP Points"],
    notes:
      "Live PROD family is ZOOM_CREDIT. Contract alt ZOOM_RECORDING|{meeting}|{enrollment} is legacy/S16 — do not mix.",
  },
  {
    id: "zoom-attend-base",
    label: "Zoom live attendance base XP",
    domain: "xp",
    canonicalDedupeKey: buildZoomAttendBaseSourceKey(FIX.zoomMeeting, FIX.enrollment),
    expectedWriter: "101-zoom-attendance-xp-award-meeting-xp.js",
    firstRun: "create ZOOM_ATTEND_BASE|{meeting}|{enrollment}",
    secondRun: "skip_existing",
    retryAfterPartialFailure: "recheck Source Key; disjoint from ZOOM_CREDIT",
    evidenceFields: ["Source Key", "Enrollment", "XP Points"],
    notes: "Fixtures permit when Zoom Attendance rows exist",
  },
  {
    id: "streak-xp",
    label: "Streak XP",
    domain: "xp",
    canonicalDedupeKey: buildStreakXpSourceKey(
      FIX.enrollment,
      FIX.achievement,
      FIX.streakEndDate
    ),
    expectedWriter:
      "054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js",
    firstRun: "create STREAK_XP|{enr}|{ach}|{endDate}",
    secondRun: "skip_existing",
    retryAfterPartialFailure: "recheck Source Key before create",
    evidenceFields: ["Source Key", "Enrollment", "XP Points"],
    notes: "Where practical — requires Streak Occurrence fixture",
  },
  {
    id: "shot-milestone",
    label: "Shot milestone unlock + XP",
    domain: "xp",
    canonicalDedupeKey: buildShotMilestoneSourceKey(FIX.enrollment, FIX.shotMilestone),
    expectedWriter:
      "066 unlock → 059 XP (Source Key SHOT_MILESTONE|{enr}|{milestoneId})",
    firstRun: "create unlock then XP with same Source Key",
    secondRun: "skip when unlock Source Key already present",
    retryAfterPartialFailure: "detectShotMilestoneCrossings ignores already-unlocked keys",
    evidenceFields: ["Milestone Source Key", "Source Key", "Enrollment"],
    notes: "Where practical",
  },
  {
    id: "perfect-week",
    label: "Perfect Week unlock + XP",
    domain: "xp",
    canonicalDedupeKey: buildPerfectWeekSourceKey(FIX.enrollment, FIX.week),
    expectedWriter: "058 unlock → 059 XP",
    firstRun: "create PERFECT_WEEK|{enr}|{weekId}",
    secondRun: "skip_existing",
    retryAfterPartialFailure: "eligibility re-eval must not mint a second unlock",
    evidenceFields: ["Source Key", "Enrollment", "Week"],
    notes: "Where practical",
  },
  {
    id: "weekly-threshold-xp",
    label: "Weekly threshold XP",
    domain: "xp",
    canonicalDedupeKey: buildWeeklyThresholdSourceKey(FIX.enrollment, FIX.week, 100),
    expectedWriter:
      "035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js",
    firstRun: "create WEEKLY_THRESHOLD|{enr}|{week}|{percent} per tier met",
    secondRun: "skip tiers already awarded",
    retryAfterPartialFailure: "recheck Source Key per tier before create",
    evidenceFields: ["Source Key", "Enrollment", "Week", "XP Points"],
    notes: "",
  },
  {
    id: "was-uniqueness",
    label: "Weekly Athlete Summary creation",
    domain: "was",
    canonicalDedupeKey: `${FIX.enrollment}|${FIX.week}`,
    expectedWriter:
      "031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js",
    firstRun: "create one WAS for Enrollment+Week",
    secondRun: "find existing — no second WAS",
    retryAfterPartialFailure: "find-or-create by Enrollment+Week; race residual documented",
    evidenceFields: ["Enrollment", "Week", "Summary Key"],
    notes: "Scripts must not write formula Summary Key",
  },
  {
    id: "weekly-email-send",
    label: "Weekly email send protection",
    domain: "email",
    canonicalDedupeKey: buildWeeklyEmailEventId(FIX.enrollment, FIX.week),
    expectedWriter:
      "072 build package → 074 webhook → Make Live writeback (eventId WEEKLY_EMAIL|…)",
    firstRun: "handoff once when Ready + Send to Make? + !Sent?",
    secondRun: "error_duplicate_send_blocked when Weekly Email Sent?=true",
    retryAfterPartialFailure:
      "webhook failure keeps Send to Make? checked; retry once after restore — no duplicate eventId send",
    evidenceFields: [
      "Weekly Email Sent?",
      "Send to Make?",
      "Weekly Email Error",
      "Make Send Status",
      "eventId",
    ],
    notes: "Schmidt-only recipients for any controlled live send",
  },
];

/**
 * Simulate first-run / second-run / partial-retry for an XP Source Key path.
 * @param {string} sourceKey
 * @returns {{ first: object, second: object, retryAfterCreate: object, repair: object }}
 */
function proveXpRerun(sourceKey) {
  const first = decideXpEventAction({ sourceKey, existingKeys: [] });
  const second = decideXpEventAction({ sourceKey, existingKeys: [sourceKey] });
  const retryAfterCreate = decideXpEventAction({
    sourceKey,
    existingKeys: [sourceKey],
  });
  const repair = decideXpEventAction({
    sourceKey,
    existingKeys: [],
    linkedXpEventId: "recXpExisting00001",
    linkedSourceKey: sourceKey,
  });
  return { first, second, retryAfterCreate, repair };
}

/**
 * Homework completion first/second/retry matrix.
 */
function proveHomeworkCompletionRerun() {
  const first = decideHomeworkCompletionAction({
    existingCompletionIdsForAsset: [],
    enrollmentId: FIX.enrollment,
    homeworkAssignmentId: FIX.homeworkAssignment,
  });
  const second = decideHomeworkCompletionAction({
    existingCompletionIdsForAsset: [FIX.homeworkCompletion],
    enrollmentId: FIX.enrollment,
    homeworkAssignmentId: FIX.homeworkAssignment,
  });
  const multiAssetRetry = planHomeworkMultiAssetCompletion({
    existingCompletionIds: [FIX.homeworkCompletion],
    assetCount: 2,
    enrollmentId: FIX.enrollment,
    homeworkAssignmentId: FIX.homeworkAssignment,
  });
  const partialNoHc = planHomeworkMultiAssetCompletion({
    existingCompletionIds: [],
    assetCount: 1,
    alreadyProcessed: false,
    enrollmentId: FIX.enrollment,
    homeworkAssignmentId: FIX.homeworkAssignment,
  });
  return { first, second, multiAssetRetry, partialNoHc };
}

module.exports = {
  FIX,
  IDEMPOTENCY_PATHS,
  proveXpRerun,
  proveHomeworkCompletionRerun,
  buildZoomCreditSourceKey,
};
