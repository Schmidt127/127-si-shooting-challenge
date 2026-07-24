/**
 * Orchestrates all workflow health checks against fixture / export payloads.
 */

"use strict";

const { resetIssueSequence, countIssues } = require("./issue");
const { buildReportJson, buildReportMarkdown } = require("./report");
const { checkEnrollment } = require("./workflows/enrollment");
const { checkSubmissions } = require("./workflows/submissions");
const { checkXpEvents } = require("./workflows/xp-events");
const { checkHomework } = require("./workflows/homework");
const { checkZoom } = require("./workflows/zoom");
const { checkVideoFeedback } = require("./workflows/video-feedback");
const { checkAchievements } = require("./workflows/achievements");
const { checkLevels } = require("./workflows/levels");
const { checkWeeklyAthleteSummary } = require("./workflows/weekly-athlete-summary");
const { checkWeeklyEmail } = require("./workflows/weekly-email");

const CHECKERS = [
  { name: "enrollment", fn: checkEnrollment },
  { name: "submissions", fn: checkSubmissions },
  { name: "xpEvents", fn: checkXpEvents },
  { name: "homework", fn: checkHomework },
  { name: "zoom", fn: checkZoom },
  { name: "videoFeedback", fn: checkVideoFeedback },
  { name: "achievements", fn: checkAchievements },
  { name: "levels", fn: checkLevels },
  { name: "weeklyAthleteSummary", fn: checkWeeklyAthleteSummary },
  { name: "weeklyEmail", fn: checkWeeklyEmail },
];

/**
 * Normalize export/fixture shapes into a single data bag.
 * Accepts:
 * - { enrollments, submissions, ... }
 * - { tables: { Enrollments: [], ... } }
 * - Airtable-like { records by table name }
 *
 * @param {object} raw
 */
function normalizeInput(raw = {}) {
  if (!raw || typeof raw !== "object") {
    throw new Error("normalizeInput: expected object fixture/export");
  }
  const tables = raw.tables && typeof raw.tables === "object" ? raw.tables : null;

  const pick = (...keys) => {
    for (const k of keys) {
      if (Array.isArray(raw[k])) return raw[k];
      if (tables && Array.isArray(tables[k])) return tables[k];
    }
    return [];
  };

  return {
    enrollments: pick("enrollments", "Enrollments"),
    submissions: pick("submissions", "Submissions"),
    submissionAssets: pick("submissionAssets", "Submission Assets"),
    homeworkCompletions: pick("homeworkCompletions", "Homework Completions"),
    xpEvents: pick("xpEvents", "XP Events"),
    videoFeedback: pick("videoFeedback", "Video Feedback"),
    zoomAttendance: pick("zoomAttendance", "Zoom Attendance"),
    zoomMeetings: pick("zoomMeetings", "Zoom Meetings"),
    achievementUnlocks: pick(
      "achievementUnlocks",
      "Athlete Achievement Unlocks",
      "achievements"
    ),
    weeklyAthleteSummaries: pick(
      "weeklyAthleteSummaries",
      "Weekly Athlete Summary",
      "was"
    ),
    weeks: pick("weeks", "Weeks"),
    currentChallengeYear: raw.currentChallengeYear || raw.meta?.currentChallengeYear || "",
    expectedWeekId: raw.expectedWeekId || raw.meta?.expectedWeekId || "",
    nowMs: raw.nowMs || raw.meta?.nowMs || Date.now(),
    meta: raw.meta || {},
  };
}

/**
 * @param {object} rawInput
 * @param {{
 *   workflows?: string[],
 *   fixturePath?: string,
 *   source?: string,
 * }} [opts]
 */
function runAudit(rawInput, opts = {}) {
  resetIssueSequence();
  let data;
  try {
    data = normalizeInput(rawInput);
  } catch (err) {
    const issues = [
      {
        id: "malformed_fixture_1",
        workflow: "Audit runner",
        sourceTable: "",
        sourceRecordId: "",
        healthStatus: "Blocking Error",
        priority: "P0",
        retryEligibility: "manual_review_required",
        recommendedAction: "Fix fixture/export JSON shape and re-run.",
        errorMessage: String(err.message || err),
        code: "malformed_fixture",
        evidence: [],
        owningAutomation: "",
        downstreamDependency: "",
        meta: {},
      },
    ];
    const report = buildReportJson({
      issues,
      fixturePath: opts.fixturePath,
      source: opts.source || "fixture",
      meta: { error: true },
    });
    return {
      issues,
      summary: countIssues(issues),
      report,
      markdown: buildReportMarkdown(report),
    };
  }

  const allow = Array.isArray(opts.workflows) && opts.workflows.length
    ? new Set(opts.workflows)
    : null;

  const issues = [];
  for (const checker of CHECKERS) {
    if (allow && !allow.has(checker.name)) continue;
    const found = checker.fn(data) || [];
    issues.push(...found);
  }

  // Stable sort: priority then workflow then record id
  const priRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  issues.sort((a, b) => {
    const pa = priRank[a.priority] != null ? priRank[a.priority] : 9;
    const pb = priRank[b.priority] != null ? priRank[b.priority] : 9;
    if (pa !== pb) return pa - pb;
    const wf = String(a.workflow).localeCompare(String(b.workflow));
    if (wf) return wf;
    return String(a.sourceRecordId).localeCompare(String(b.sourceRecordId));
  });

  const report = buildReportJson({
    issues,
    fixturePath: opts.fixturePath,
    source: opts.source || "fixture",
    meta: {
      currentChallengeYear: data.currentChallengeYear,
      checkersRun: CHECKERS.filter((c) => !allow || allow.has(c.name)).map((c) => c.name),
    },
  });

  return {
    issues,
    summary: countIssues(issues),
    report,
    markdown: buildReportMarkdown(report),
  };
}

module.exports = {
  CHECKERS,
  normalizeInput,
  runAudit,
};
