/**
 * Production field-name contracts per workflow.
 * Does not invent field IDs. Names match automation scripts / schema docs.
 */

"use strict";

const WORKFLOWS = Object.freeze({
  ENROLLMENT: "Enrollment intake",
  SUBMISSION: "Submission intake",
  SUBMISSION_BASE_XP: "Submission Base XP",
  SUBMISSION_ASSETS: "Submission Assets",
  HOMEWORK_COMPLETION: "Homework Completion",
  HOMEWORK_XP: "Homework XP",
  VIDEO_FEEDBACK: "Video Feedback",
  VIDEO_FEEDBACK_XP: "Video Feedback XP",
  ZOOM_ATTENDANCE: "Zoom attendance",
  ZOOM_XP: "Zoom XP",
  STREAK_ACHIEVEMENTS: "Streak achievements",
  STREAK_XP: "Streak XP",
  SHOT_MILESTONES: "Shot milestones",
  PERFECT_WEEK: "Perfect Week",
  WEEKLY_THRESHOLD_XP: "Weekly threshold XP",
  LEVEL_RECALC: "Level recalculation",
  LEVEL_ASSIGNMENT: "Level assignment",
  LEVEL_GATES: "Level gates",
  WEEKLY_ATHLETE_SUMMARY: "Weekly Athlete Summary",
  WEEKLY_EMAIL_BUILD: "Weekly email build",
  WEEKLY_EMAIL_SCHEDULE: "Weekly email scheduling",
  MAKE_HANDOFF: "Airtable-to-Make handoff",
  MAKE_GMAIL: "Make-to-Gmail send",
  MAKE_WRITEBACK: "Make-to-Airtable sent-status writeback",
});

const OWNING_AUTOMATIONS = Object.freeze({
  enrollment: "001/002/003",
  submissionWeek: "005",
  submissionAssets: "009",
  submissionXp: "010",
  videoFeedback: "013",
  homeworkCompletion: "020/067",
  homeworkXp: "064/065",
  videoFeedbackXp: "114",
  zoomAttendance: "117",
  zoomXp: "101/057/042",
  streak: "053/054/055/056",
  shotMilestones: "066",
  perfectWeek: "057/058",
  achievementXp: "059",
  levelRecalc: "041",
  levelAssign: "042",
  wasEnsure: "031/118",
  weeklyEmailBuild: "072",
  weeklyEmailScheduleBuild: "118",
  weeklyEmailScheduleSend: "119",
  weeklyEmailHandoff: "074",
  makeWriteback: "Make Bulk Email May 18 (Live branch)",
});

/** Canonical WAS weekly-email fields (072/074/Make). */
const WAS_EMAIL_FIELDS = Object.freeze({
  buildNow: "Build Weekly Email Now?",
  ready: "Weekly Email Ready?",
  sent: "Weekly Email Sent?",
  sentAt: "Weekly Email Sent At",
  sendToMake: "Send to Make?",
  subject: "Weekly Email Subject",
  recipients: "Weekly Email Recipients",
  html: "Weekly Email HTML",
  text: "Weekly Email Text",
  payloadJson: "Weekly Email Payload JSON",
  error: "Weekly Email Error",
  sendMode: "sendMode",
  makeSendStatus: "Make Send Status",
  weekLabel: "Weekly Email Week Label",
  enrollment: "Enrollment",
  week: "Week",
});

module.exports = {
  WORKFLOWS,
  OWNING_AUTOMATIONS,
  WAS_EMAIL_FIELDS,
};
