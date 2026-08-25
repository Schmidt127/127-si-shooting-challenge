/**
 * Public `/shoot` Airtable table registry.
 * Names are the live REST table names used by the web client.
 * IDs are from schema snapshots / live base evidence where known.
 */

export const PUBLIC_AIRTABLE_TABLES = {
  enrollments: { name: "Enrollments", id: "tbl3PFmwbRoabu1YV" },
  programInstanceSync: { name: "Program Instance - Sync", id: "tblMfALZa4YYUy70P" },
  levels: { name: "Levels", id: "tblU6EWmc1jCpgRHe" },
  weeks: { name: "Weeks", id: "tblcsKugv1cla36A6" },
  weeklySummary: { name: "Weekly Athlete Summary", id: "tbl9520d72adxlAKQ" },
  xpEvents: { name: "XP Events", id: "tblmGSiNA1akW8KnU" },
  achievements: { name: "Achievements", id: "tblrADEQbvH9kBfMZ" },
  achievementUnlocks: { name: "Athlete Achievement Unlocks", id: "tblyT2AQo1JbvmvZS" },
  submissions: { name: "Submissions", id: "tblEVjVpGGlPTsYSt" },
  homeworkCompletions: { name: "Homework Completions", id: "tblv58ppTFDBXb3nv" },
  /** Live public homework content table name (formerly FBC Curriculum - SYNC). */
  homeworkLibrary: { name: "Homework Library", id: "tblUuxwYlX4EQ9MKE" },
  programHomeworkAssignments: { name: "Program Homework Assignments", id: "tblhA3maf7xOa8EUS" },
  gradeBands: { name: "Grade Bands", id: "tblOhHrIqpjcsk2WG" },
  /** Canonical public media table (deleted `Tutorials` / `tbldfoVGdhqATi4MS` must not be used). */
  tutorials: { name: "Tutorials & Assets", id: "tblDOTgsWfqPm18bw" },
  zoomMeetings: { name: "Zoom Meetings", id: "tblWcSHEm8vNNIxyB" },
  xpRewardRules: { name: "XP Reward Rules", id: null },
  videoFeedback: { name: "Video Feedback", id: "tblOV6pJDxQFBSQ3q" },
} as const;

/** Season selection filter — historical Config rows are intentional and must not gate the site. */
export const REGISTERING_SHOOTING_CHALLENGE_FILTER =
  "AND({Program - Linked}='Shooting Challenge',{Status}='Registering')";

export const PUBLIC_ENROLLMENT_VIEW = "Web - Leaderboard";
