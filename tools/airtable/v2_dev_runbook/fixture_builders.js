/**
 * Reusable DEV fixture builders (offline-safe).
 * Wraps v2-engine-contracts Source Key / decision helpers for runbook domains.
 *
 * Does NOT call Airtable. Live writes require Mike-authorized DEV scripts separately.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const contracts = require("../../../airtable/automations/shooting-challenge/lib/v2-engine-contracts");

const ROOT = path.resolve(__dirname);
const FIXTURES = path.join(ROOT, "fixtures");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function loadIds() {
  return loadJson("ids.json");
}

function resolveTemplate(str, ids) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in ids)) {
      throw new Error(`Unknown fixture id placeholder: ${key}`);
    }
    return ids[key];
  });
}

function buildDomainSourceKeys(ids) {
  return {
    enrollment: ids.enrollment,
    submissionXp: contracts.buildSubmissionXpSourceKey(ids.submission),
    homeworkXp: contracts.buildHomeworkXpSourceKey(ids.homework_completion),
    videoXp: contracts.buildVideoXpSourceKey(ids.video_feedback),
    streakXp: contracts.buildStreakXpSourceKey(
      ids.enrollment,
      ids.achievement_streak,
      "2026-07-15",
    ),
    shotMilestone: contracts.buildShotMilestoneSourceKey(
      ids.enrollment,
      ids.shot_milestone_100,
    ),
    perfectWeek: contracts.buildPerfectWeekSourceKey(ids.enrollment, ids.week),
    zoomAttendBase: contracts.buildZoomAttendBaseSourceKey(
      ids.zoom_meeting,
      ids.enrollment,
    ),
    zoomAttendBonus2: contracts.buildZoomAttendBonus2SourceKey(ids.enrollment),
    zoomAttendBonus3: contracts.buildZoomAttendBonus3SourceKey(ids.enrollment),
    zoomRecording: contracts.buildZoomRecordingCreditSourceKey(
      ids.zoom_meeting,
      ids.enrollment,
    ),
  };
}

function buildEvidenceShell(testId, options = {}) {
  const now = new Date().toISOString();
  return {
    testId,
    environment: "DEV",
    baseIdExpected: "appTetnuCZlCZdTCT",
    recordedAt: now,
    operator: options.operator || "",
    enrollmentId: options.enrollmentId || "",
    preTestState: options.preTestState || "",
    recordsCreated: options.recordsCreated || [],
    automationExpected: options.automationExpected || "",
    expectedOutput: options.expectedOutput || "",
    actualOutput: options.actualOutput || "",
    cleanup: options.cleanup || "",
    rollback: options.rollback || "",
    evidenceLocation: options.evidenceLocation || `docs/v2/evidence/${now.slice(0, 10)}-${testId}.md`,
    result: options.result || "U",
    notes: options.notes || "",
  };
}

function formatEvidenceMarkdown(shell) {
  return [
    `# DEV test evidence — ${shell.testId}`,
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Environment | ${shell.environment} |`,
    `| Base ID | ${shell.baseIdExpected} |`,
    `| Recorded at | ${shell.recordedAt} |`,
    `| Operator | ${shell.operator || "_pending_"} |`,
    `| Enrollment ID | ${shell.enrollmentId || "_pending_"} |`,
    `| Result | ${shell.result} |`,
    "",
    "## Pre-test state",
    "",
    shell.preTestState || "_not recorded_",
    "",
    "## Records created",
    "",
    shell.recordsCreated.length
      ? shell.recordsCreated.map((r) => `- \`${r}\``).join("\n")
      : "_none / pending_",
    "",
    "## Automation expected",
    "",
    shell.automationExpected || "_see matrix_",
    "",
    "## Expected output",
    "",
    typeof shell.expectedOutput === "string"
      ? shell.expectedOutput
      : "```json\n" + JSON.stringify(shell.expectedOutput, null, 2) + "\n```",
    "",
    "## Actual output",
    "",
    shell.actualOutput || "_not run — do not invent_",
    "",
    "## Cleanup",
    "",
    shell.cleanup || "_see fixture_",
    "",
    "## Rollback",
    "",
    shell.rollback || "_see fixture_",
    "",
    "## Evidence location",
    "",
    shell.evidenceLocation,
    "",
    "## Notes",
    "",
    shell.notes || "",
    "",
  ].join("\n");
}

function listFixtureDomains() {
  return fs
    .readdirSync(FIXTURES)
    .filter((name) => name.endsWith(".json") && name !== "ids.json")
    .map((name) => name.replace(/\.json$/, ""));
}

module.exports = {
  loadJson,
  loadIds,
  resolveTemplate,
  buildDomainSourceKeys,
  buildEvidenceShell,
  formatEvidenceMarkdown,
  listFixtureDomains,
  contracts,
  FIXTURES,
  ROOT,
};
